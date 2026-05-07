const db = require("./database");

const roomTimers = new Map();
const roomHosts = new Map();
const roomTimerConfigs = new Map(); // Store custom durations per room

async function cleanupEmptyRoom({ io, roomCode, room }) {
  // If the last member left a public room, ARCHIVE it (soft delete) so it
  // won't show in public lists, but session_logs won't be removed by the
  // `session_logs.room_id -> rooms.id ON DELETE CASCADE` constraint.
  if (!room?.is_public) return;

  const remaining = (await db.getParticipants(room.id)).result || [];
  if (remaining.length > 0) return;

  try {
    await db.archiveRoom(room.id);
  } catch (e) {
    console.error("[ROOM_ARCHIVE_ERROR]", e);
  } finally {
    roomHosts.delete(roomCode);
    stopRoomTimer(roomCode);
    roomTimers.delete(roomCode);
    roomTimerConfigs.delete(roomCode);
  }
}

function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`[SOCKET] User connected: ${socket.id}`);

    socket.on("room:join", async (data) => {
      try {
        const { roomCode, userId, username } = data;
        if (!roomCode || !userId) return;

        const roomResult = await db.getRoomByCode(roomCode);
        if (!roomResult.success) {
          socket.emit("error", { message: "Room not found" });
          return;
        }
        const room = roomResult.result;

        // Determine current host (from memory or DB) before inserting/updating participant.
        let currentHostId = roomHosts.get(roomCode);
        if (!currentHostId) {
          const existingParticipants = (await db.getParticipants(room.id)).result || [];
          const existingHost = existingParticipants.find((p) => p.is_host);
          if (existingHost) currentHostId = existingHost.user_id;
        }

        // Check if user should be host (creator becomes host only if no host exists yet)
        const isCreator =
          String(room.created_by).toLowerCase() === String(userId).toLowerCase();
        const isHost = !currentHostId && isCreator;
        if (isHost) roomHosts.set(roomCode, userId);

        const participantResult = await db.addParticipant(room.id, userId, username, isHost);
        if (!participantResult?.success) {
          console.error("[ADD_PARTICIPANT_ERROR]", participantResult?.error);
          socket.emit("error", { message: participantResult?.error || "Failed to join room" });
          return;
        }

        const sessionStartResult = await db.logSessionStart(userId, room.id);
        if (!sessionStartResult?.success) {
          // Don't block joining the room, but log it so we can fix DB/RLS issues.
          console.error("[SESSION_START_LOG_ERROR]", sessionStartResult?.error);
        }

        const participantsResult = await db.getParticipants(room.id);
        const participants = participantsResult.result || [];

        // If we still don't have a host (e.g. creator isn't present), pick the earliest participant.
        if (!roomHosts.get(roomCode)) {
          const host = participants.find((p) => p.is_host) || participants[0];
          if (host) {
            roomHosts.set(roomCode, host.user_id);
            if (!host.is_host) {
              await db.setHostStatus(room.id, host.user_id, true);
            }
          }
        }

        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.userId = userId;
        socket.username = username;

        // Initialize timer if not exists
        if (!roomTimers.has(roomCode)) {
          const config = roomTimerConfigs.get(roomCode) || { studyDuration: 1500, breakDuration: 300 };
          roomTimers.set(roomCode, {
            timeRemaining: config.studyDuration,
            totalTime: config.studyDuration,
            isRunning: false,
            mode: "study",
            interval: null,
          });
        }

        const timer = roomTimers.get(roomCode);
        const config = roomTimerConfigs.get(roomCode) || { studyDuration: 1500, breakDuration: 300 };

        // Broadcast updated state
        const roomState = {
          room,
          participants,
          timer: getTimerPublicState(timer),
          config, // Send current config to clients
          tasks: (await db.getTasks(room.id)).result || []
        };

        io.to(roomCode).emit("room:state", roomState);
        
        // Send chat history
        const chatResult = await db.getChatHistory(room.id);
        socket.emit("chat:history", { messages: chatResult.result || [] });

      } catch (error) {
        console.error("[ROOM_JOIN_ERROR]", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    socket.on("room:leave", async (data) => {
      const roomCode = data?.roomCode || socket.roomCode;
      const userId = data?.userId || socket.userId;
      if (!roomCode || !userId) return;

      try {
        const roomResult = await db.getRoomByCode(roomCode);
        if (!roomResult.success) return;
        const room = roomResult.result;

        const removeResult = await db.removeParticipant(room.id, userId);
        if (!removeResult?.success) console.error("[REMOVE_PARTICIPANT_ERROR]", removeResult?.error);

        const sessionEndResult = await db.logSessionEnd(userId, room.id);
        if (!sessionEndResult?.success) console.error("[SESSION_END_LOG_ERROR]", sessionEndResult?.error);

        // Host transfer if host left
        const hostId = roomHosts.get(roomCode);
        if (hostId && String(hostId).toLowerCase() === String(userId).toLowerCase()) {
          const participants = (await db.getParticipants(room.id)).result || [];
          const newHost = participants.find((p) => p.user_id !== userId) || null;
          if (newHost) {
            await db.setHostStatus(room.id, newHost.user_id, true);
            roomHosts.set(roomCode, newHost.user_id);
          } else {
            roomHosts.delete(roomCode);
            stopRoomTimer(roomCode);
            roomTimers.delete(roomCode);
            roomTimerConfigs.delete(roomCode);
          }
        }

        const updatedParticipants = (await db.getParticipants(room.id)).result || [];
        io.to(roomCode).emit("room:state", { participants: updatedParticipants });

        // If a public room becomes empty, delete it.
        await cleanupEmptyRoom({ io, roomCode, room });

        socket.leave(roomCode);
      } catch (e) {
        console.error("[ROOM_LEAVE_ERROR]", e);
      }
    });

    socket.on("timer:start", () => {
      const { roomCode, userId } = socket;
      if (!isAuthoritative(roomCode, userId)) return;
      const timer = roomTimers.get(roomCode);
      if (timer && !timer.isRunning) {
        timer.isRunning = true;
        startRoomTimer(io, roomCode);
        io.to(roomCode).emit("timer:started", getTimerPublicState(timer));
      }
    });

    socket.on("timer:pause", () => {
      const { roomCode, userId } = socket;
      if (!isAuthoritative(roomCode, userId)) return;
      const timer = roomTimers.get(roomCode);
      if (timer && timer.isRunning) {
        timer.isRunning = false;
        stopRoomTimer(roomCode);
        io.to(roomCode).emit("timer:paused", getTimerPublicState(timer));
      }
    });

    socket.on("timer:resume", () => {
      const { roomCode, userId } = socket;
      if (!isAuthoritative(roomCode, userId)) return;
      const timer = roomTimers.get(roomCode);
      if (timer && !timer.isRunning) {
        timer.isRunning = true;
        startRoomTimer(io, roomCode);
        io.to(roomCode).emit("timer:resumed", getTimerPublicState(timer));
      }
    });

    socket.on("timer:reset", () => {
      const { roomCode, userId } = socket;
      if (!isAuthoritative(roomCode, userId)) return;
      const timer = roomTimers.get(roomCode);
      if (timer) {
        const config = roomTimerConfigs.get(roomCode) || { studyDuration: 1500, breakDuration: 300 };
        timer.isRunning = false;
        stopRoomTimer(roomCode);
        timer.mode = "study";
        timer.timeRemaining = config.studyDuration;
        timer.totalTime = config.studyDuration;
        io.to(roomCode).emit("timer:reset", getTimerPublicState(timer));
      }
    });

    socket.on("timer:configure", (data) => {
      const { roomCode, userId } = socket;
      if (!isAuthoritative(roomCode, userId)) return;
      const { studyDuration, breakDuration } = data;
      
      // Update config store
      roomTimerConfigs.set(roomCode, { studyDuration, breakDuration });
      
      const timer = roomTimers.get(roomCode);
      if (timer) {
        // If not running, update current time immediately
        if (!timer.isRunning) {
          timer.timeRemaining = timer.mode === "study" ? studyDuration : breakDuration;
          timer.totalTime = timer.mode === "study" ? studyDuration : breakDuration;
        }
      }

      io.to(roomCode).emit("timer:configured", {
        studyDuration,
        breakDuration,
        timer: getTimerPublicState(timer),
        message: "Timer settings updated"
      });
    });

    socket.on("task:add", async (data) => {
      const { roomCode, userId } = socket;
      try {
        const roomResult = await db.getRoomByCode(roomCode);
        const taskResult = await db.addTask(roomResult.result.id, data.title, userId);
        io.to(roomCode).emit("task:added", taskResult.result);
      } catch (e) { socket.emit("error", { message: "Failed to add task" }); }
    });

    socket.on("task:update", async (data) => {
      const { roomCode } = socket;
      try {
        const taskResult = await db.updateTask(data.taskId, data.updates);
        io.to(roomCode).emit("task:updated", taskResult.result);
      } catch (e) { socket.emit("error", { message: "Failed to update task" }); }
    });

    socket.on("task:delete", async (data) => {
      const { roomCode } = socket;
      try {
        await db.deleteTask(data.taskId);
        io.to(roomCode).emit("task:deleted", { taskId: data.taskId });
      } catch (e) { socket.emit("error", { message: "Failed to delete task" }); }
    });

    socket.on("chat:message", async (data) => {
      const roomCode = socket.roomCode;
      const userId = socket.userId;
      const username = socket.username;
      const message = typeof data?.message === "string" ? data.message.trim() : "";
      if (!roomCode || !userId || !message) return;
      try {
        const roomResult = await db.getRoomByCode(roomCode);
        const msgResult = await db.addChatMessage(
          roomResult.result.id,
          userId,
          username,
          message,
        );
        if (!msgResult?.success) {
          socket.emit("error", { message: msgResult?.error || "Failed to send message" });
          return;
        }
        io.to(roomCode).emit("chat:message", msgResult.result);
      } catch (e) {
        socket.emit("error", { message: e?.message || "Failed to send message" });
      }
    });

    socket.on("host:transfer", async (data) => {
      const { roomCode, userId } = socket;
      if (!isAuthoritative(roomCode, userId)) return;
      try {
        const roomResult = await db.getRoomByCode(roomCode);
        await db.setHostStatus(roomResult.result.id, userId, false);
        await db.setHostStatus(roomResult.result.id, data.newHostId, true);
        roomHosts.set(roomCode, data.newHostId);
        const participants = (await db.getParticipants(roomResult.result.id)).result;
        io.to(roomCode).emit("room:state", { participants });
      } catch (e) {}
    });

    socket.on("participant:remove", async (data) => {
      const { roomCode, userId: hostId } = socket;
      if (!isAuthoritative(roomCode, hostId)) return;
      try {
        const roomResult = await db.getRoomByCode(roomCode);
        await db.removeParticipant(roomResult.result.id, data.userId);
        const participants = (await db.getParticipants(roomResult.result.id)).result;
        io.to(roomCode).emit("room:state", { participants });
        // Also tell that specific client to leave
        io.to(roomCode).emit("participant:removed", { userId: data.userId });
      } catch (e) {}
    });

    socket.on("disconnect", () => {
      console.log(`[SOCKET] User disconnected: ${socket.id}`);
      // Treat disconnect as a leave (best-effort).
      const roomCode = socket.roomCode;
      const userId = socket.userId;
      if (!roomCode || !userId) return;

      (async () => {
        try {
          const roomResult = await db.getRoomByCode(roomCode);
          if (!roomResult.success) return;
          const room = roomResult.result;

          const removeResult = await db.removeParticipant(room.id, userId);
          if (!removeResult?.success) console.error("[REMOVE_PARTICIPANT_ERROR]", removeResult?.error);

          const sessionEndResult = await db.logSessionEnd(userId, room.id);
          if (!sessionEndResult?.success) console.error("[SESSION_END_LOG_ERROR]", sessionEndResult?.error);

          // Host transfer if host left
          const hostId = roomHosts.get(roomCode);
          if (hostId && String(hostId).toLowerCase() === String(userId).toLowerCase()) {
            const participants = (await db.getParticipants(room.id)).result || [];
            const newHost = participants.find((p) => p.user_id !== userId) || null;
            if (newHost) {
              await db.setHostStatus(room.id, newHost.user_id, true);
              roomHosts.set(roomCode, newHost.user_id);
            } else {
              roomHosts.delete(roomCode);
              stopRoomTimer(roomCode);
              roomTimers.delete(roomCode);
              roomTimerConfigs.delete(roomCode);
            }
          }

          const updatedParticipants = (await db.getParticipants(room.id)).result || [];
          io.to(roomCode).emit("room:state", { participants: updatedParticipants });

          // If a public room becomes empty, delete it.
          await cleanupEmptyRoom({ io, roomCode, room });
        } catch (e) {
          console.error("[DISCONNECT_CLEANUP_ERROR]", e);
        }
      })();
    });
  });
}

function startRoomTimer(io, roomCode) {
  const timer = roomTimers.get(roomCode);
  if (!timer || timer.interval) return;

  timer.interval = setInterval(() => {
    if (timer.timeRemaining > 0) {
      timer.timeRemaining--;
      io.to(roomCode).emit("timer:tick", getTimerPublicState(timer));
    } else {
      // Transition
      const config = roomTimerConfigs.get(roomCode) || { studyDuration: 1500, breakDuration: 300 };
      timer.mode = timer.mode === "study" ? "break" : "study";
      timer.timeRemaining = timer.mode === "study" ? config.studyDuration : config.breakDuration;
      timer.totalTime = timer.timeRemaining;
      io.to(roomCode).emit("timer:transitioned", getTimerPublicState(timer));
    }
  }, 1000);
}

function stopRoomTimer(roomCode) {
  const timer = roomTimers.get(roomCode);
  if (timer && timer.interval) {
    clearInterval(timer.interval);
    timer.interval = null;
  }
}

function isAuthoritative(roomCode, userId) {
  const hostId = roomHosts.get(roomCode);
  return String(hostId).toLowerCase() === String(userId).toLowerCase();
}

function getTimerPublicState(timer) {
  return {
    timeRemaining: timer.timeRemaining,
    totalTime: timer.totalTime,
    mode: timer.mode,
    isRunning: timer.isRunning,
  };
}

function getRoomTimerState(roomCode) {
  const timer = roomTimers.get(roomCode);
  return timer ? getTimerPublicState(timer) : null;
}

module.exports = {
  setupSocketHandlers,
  getRoomTimerState
};
