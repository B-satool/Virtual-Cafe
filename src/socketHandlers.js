/**
 * socketHandlers.js - Master Sync System for Virtual Café
 */
const db = require("./database");

// In-memory state tracking
const roomTimers = new Map(); // roomCode -> { timeRemaining, totalTime, iRunning, mode, intervalId }
const roomHosts = new Map(); // roomCode -> hostUserId (who currently has control)
const disconnectTimeouts = new Map(); // userId -> { timeoutId, roomCode }
const roomChatMessages = new Map(); // roomCode -> [{ userId, username, message, timestamp }, ...]
const roomTimerConfigs = new Map(); // roomCode -> { studyDuration, breakDuration }

/**
 * Initialize all socket event handlers
 * @param {Object} io - Socket.io server instance
 */
function initSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`[CONN] User connected: ${socket.id}`);

    // ---- ROOM MANAGEMENT ----

    socket.on("room:join", async (data) => {
      try {
        const { roomCode, userId, username } = data;
        console.log(`[JOIN] ${username} (${userId}) joining room ${roomCode}`);

        // Get room from database
        const roomResult = await db.getRoomByCode(roomCode);
        if (!roomResult.success) {
          socket.emit("error", { message: "Room not found" });
          return;
        }
        const room = roomResult.result;

        // Sync disconnect cleanup
        if (disconnectTimeouts.has(userId)) {
          clearTimeout(disconnectTimeouts.get(userId).timeoutId);
          disconnectTimeouts.delete(userId);
        }

        // Authoritative Host Logic
        await syncRoomHost(
          io,
          roomCode,
          room.id,
          room.created_by,
          userId,
          username,
        );
        const currentHostId = roomHosts.get(roomCode);
        const isHost =
          String(currentHostId).toLowerCase() === String(userId).toLowerCase();

        console.log(
          `[JOIN] After syncRoomHost - currentHostId: ${currentHostId}, userId: ${userId}, isHost: ${isHost}`,
        );

        // Add to database if needed
        const participantsResult = await db.getParticipants(room.id);
        const participants = participantsResult.result || [];
        const existing = participants.find(
          (p) =>
            String(p.user_id).toLowerCase() === String(userId).toLowerCase(),
        );

        if (!existing) {
          if (participants.length >= room.capacity) {
            socket.emit("error", { message: "Room is full" });
            return;
          }
          await db.addParticipant(room.id, userId, username, isHost);
        } else {
          // Update host status if server decided they are host
          if (existing.is_host !== isHost) {
            await db.setHostStatus(room.id, userId, isHost);
          }
        }

        // Setup socket session
        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.userId = userId;
        socket.username = username;

        // Log session start
        await db.logSessionStart(userId, room.id);

        // Initialize timer if first joiner
        if (!roomTimers.has(roomCode)) {
          const studyDuration = 25 * 60; // 25 minutes
          const breakDuration = 5 * 60; // 5 minutes

          roomTimers.set(roomCode, {
            timeRemaining: studyDuration,
            totalTime: studyDuration,
            isRunning: false,
            mode: "study",
            intervalId: null,
          });

          // Initialize timer config
          roomTimerConfigs.set(roomCode, {
            studyDuration,
            breakDuration,
          });
        }

        // Global broadcast of updated state
        await broadcastRoomUpdate(io, roomCode, room);

        // Send chat history to newly joined user
        const chatHistory = roomChatMessages.get(roomCode) || [];
        socket.emit("chat:history", { messages: chatHistory });
      } catch (error) {
        console.error("[ROOM_JOIN_ERROR]", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    socket.on("room:leave", async () => {
      await handleUserDeparture(io, socket, true);
    });

    // ---- TIMER EVENTS (Authoritative) ----

    socket.on("timer:start", () => {
      const { roomCode, userId } = socket;
      if (!isAuthoritative(roomCode, userId)) return;

      const timer = roomTimers.get(roomCode);
      if (timer && !timer.isRunning) {
        timer.isRunning = true;
        startRoomTimer(io, roomCode);
        console.log(`[TIMER] Room ${roomCode} started`);
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
        console.log(`[TIMER] Room ${roomCode} paused`);
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
        console.log(`[TIMER] Room ${roomCode} resumed`);
        io.to(roomCode).emit("timer:resumed", getTimerPublicState(timer));
      }
    });

    socket.on("timer:reset", () => {
      const { roomCode, userId } = socket;
      if (!isAuthoritative(roomCode, userId)) return;

      const timer = roomTimers.get(roomCode);
      const config = roomTimerConfigs.get(roomCode) || {
        studyDuration: 25 * 60,
        breakDuration: 5 * 60,
      };

      if (timer) {
        stopRoomTimer(roomCode);
        timer.isRunning = false;
        timer.mode = "study";
        timer.timeRemaining = config.studyDuration;
        timer.totalTime = config.studyDuration;
        console.log(
          `[TIMER] Room ${roomCode} reset with custom durations (study: ${config.studyDuration}s, break: ${config.breakDuration}s)`,
        );
        io.to(roomCode).emit("timer:reset", getTimerPublicState(timer));
      }
    });

    socket.on("timer:configure", (data) => {
      const { roomCode, userId } = socket;
      if (!isAuthoritative(roomCode, userId)) return;

      const { studyDuration, breakDuration } = data;
      if (!studyDuration || !breakDuration) return;

      // Validate ranges
      if (
        studyDuration < 60 ||
        studyDuration > 7200 ||
        breakDuration < 60 ||
        breakDuration > 3600
      ) {
        socket.emit("error", { message: "Timer durations out of valid range" });
        return;
      }

      // Update configuration
      roomTimerConfigs.set(roomCode, {
        studyDuration,
        breakDuration,
      });

      console.log(
        `[TIMER] Room ${roomCode} configured: study ${studyDuration}s, break ${breakDuration}s`,
      );
      io.to(roomCode).emit("timer:configured", {
        studyDuration,
        breakDuration,
        message: "Timer settings updated by host",
      });
    });

    // ---- TASK EVENTS ----

    socket.on("task:add", async (data) => {
      try {
        const { roomCode, userId } = socket;
        const { title } = data;
        if (!roomCode || !title) return;

        const roomResult = await db.getRoomByCode(roomCode);
        if (!roomResult.success) return;

        const taskResult = await db.addTask(
          roomResult.result.id,
          title,
          userId,
        );
        if (taskResult.success) {
          io.to(roomCode).emit("task:added", taskResult.result);
        }
      } catch (error) {
        console.error("[TASK_ADD_ERROR]", error);
      }
    });

    socket.on("task:update", async (data) => {
      try {
        const { roomCode } = socket;
        const { taskId, updates } = data;
        if (!roomCode || !taskId) return;

        const result = await db.updateTask(taskId, updates);
        if (result.success) {
          io.to(roomCode).emit("task:updated", result.result);
        }
      } catch (error) {
        console.error("[TASK_UPDATE_ERROR]", error);
      }
    });

    socket.on("task:delete", async (data) => {
      try {
        const { roomCode } = socket;
        const { taskId } = data;
        if (!roomCode || !taskId) return;

        const result = await db.deleteTask(taskId);
        if (result.success) {
          io.to(roomCode).emit("task:deleted", { taskId });
        }
      } catch (error) {
        console.error("[TASK_DELETE_ERROR]", error);
      }
    });

    // ---- HOST MANAGEMENT ----

    socket.on("host:transfer", async (data) => {
      try {
        const { roomCode } = socket;
        const { newHostId } = data;
        const currentHostId = roomHosts.get(roomCode);

        // Only the current host can transfer
        if (!isAuthoritative(roomCode, socket.userId)) {
          socket.emit("error", {
            message: "Only the host can transfer host role",
          });
          return;
        }

        if (!newHostId || !roomCode) {
          socket.emit("error", { message: "Invalid transfer request" });
          return;
        }

        // Update in-memory state
        roomHosts.set(roomCode, newHostId);
        console.log(
          `[HOST_TRANSFER] Room ${roomCode}: ${currentHostId} -> ${newHostId}`,
        );

        // Update database
        const roomResult = await db.getRoomByCode(roomCode);
        if (roomResult.success) {
          const room = roomResult.result;
          // Set old host to non-host
          await db.setHostStatus(room.id, currentHostId, false);
          // Set new host to host
          await db.setHostStatus(room.id, newHostId, true);
        }

        // Broadcast update to all participants
        await broadcastRoomUpdate(io, roomCode);
        socket.emit("host:transferred", { success: true, newHostId });
      } catch (error) {
        console.error("[HOST_TRANSFER_ERROR]", error);
        socket.emit("error", { message: "Failed to transfer host role" });
      }
    });

    socket.on("participant:remove", async (data) => {
      try {
        const { roomCode } = socket;
        const { userId: targetUserId } = data;

        // Only the current host can remove participants
        if (!isAuthoritative(roomCode, socket.userId)) {
          socket.emit("error", {
            message: "Only the host can remove participants",
          });
          return;
        }

        if (!targetUserId || !roomCode) {
          socket.emit("error", { message: "Invalid remove request" });
          return;
        }

        // Cannot remove yourself
        if (
          String(targetUserId).toLowerCase() ===
          String(socket.userId).toLowerCase()
        ) {
          socket.emit("error", {
            message: "Cannot remove yourself. Use Leave Room instead.",
          });
          return;
        }

        const roomResult = await db.getRoomByCode(roomCode);
        if (!roomResult.success) {
          socket.emit("error", { message: "Room not found" });
          return;
        }
        const room = roomResult.result;

        // Remove from database
        await db.removeParticipant(room.id, targetUserId);
        console.log(
          `[PARTICIPANT_REMOVE] Room ${roomCode}: Host removed ${targetUserId}`,
        );

        // Notify the removed participant
        const targetSocket = await io.in(roomCode).fetchSockets();
        const removed = targetSocket.find(
          (s) =>
            String(s.userId).toLowerCase() ===
            String(targetUserId).toLowerCase(),
        );
        if (removed) {
          removed.emit("participant:removed", {
            reason: "You were removed by the host",
          });
          removed.leave(roomCode);
        }

        // Broadcast update to remaining participants
        await broadcastRoomUpdate(io, roomCode);
        io.to(roomCode).emit("participant:removed_from_room", {
          userId: targetUserId,
        });
      } catch (error) {
        console.error("[PARTICIPANT_REMOVE_ERROR]", error);
        socket.emit("error", { message: "Failed to remove participant" });
      }
    });

    // ---- CHAT ----

    socket.on("chat:message", (data) => {
      try {
        const { roomCode, userId, username, message, timestamp } = data;

        if (!roomCode || !userId || !message) {
          console.warn("[CHAT_ERROR] Missing required fields");
          return;
        }

        // Validate message length (prevent abuse)
        if (message.length > 500) {
          socket.emit("error", {
            message: "Message too long (max 500 characters)",
          });
          return;
        }

        // Create message object
        const messageData = {
          userId,
          username,
          message,
          timestamp: timestamp || new Date().toISOString(),
        };

        // Store message in room history (keep last 100 messages per room)
        if (!roomChatMessages.has(roomCode)) {
          roomChatMessages.set(roomCode, []);
        }

        const messages = roomChatMessages.get(roomCode);
        messages.push(messageData);

        // Keep only last 100 messages per room
        if (messages.length > 100) {
          messages.shift();
        }

        // Broadcast message to all participants in the room
        io.to(roomCode).emit("chat:message", messageData);
        console.log(
          `[CHAT] ${username} in room ${roomCode}: ${message.substring(0, 50)}...`,
        );
      } catch (error) {
        console.error("[CHAT_ERROR]", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ---- DISCONNECT ----

    socket.on("disconnect", () => {
      const { roomCode, userId, username } = socket;
      if (!roomCode || !userId) return;

      console.log(
        `[DISCONNECT] ${username} (${userId}) - Starting grace period`,
      );
      const timeoutId = setTimeout(() => {
        handleUserDeparture(io, socket, false);
        disconnectTimeouts.delete(userId);
      }, 5000);

      disconnectTimeouts.set(userId, { timeoutId, roomCode });
    });
  });
}

/**
 * Sync the authoritative host for a room
 */
async function syncRoomHost(
  io,
  roomCode,
  roomId,
  creatorId,
  currentUserId,
  currentUsername,
) {
  const participantsResult = await db.getParticipants(roomId);
  const participants = participantsResult.result || [];

  console.log(
    `[SYNC_HOST] Room ${roomCode}: Current participants:`,
    participants,
  );
  console.log(
    `[SYNC_HOST] Looking for creator (${creatorId}) or first participant`,
  );

  // We decide who is host based on visibility and priority
  let newHostId = null;

  // 1. Is the creator here?
  const creator = participants.find(
    (p) => String(p.user_id).toLowerCase() === String(creatorId).toLowerCase(),
  );
  if (creator) {
    newHostId = creator.user_id;
    console.log(`[SYNC_HOST] Creator found as participant: ${newHostId}`);
  } else if (participants.length > 0) {
    // 2. If creator is absent, take the first person who joined
    newHostId = participants[0].user_id;
    console.log(
      `[SYNC_HOST] Creator not in participants, using first: ${newHostId}`,
    );
  } else {
    // 3. If room is empty, the current joiner is host
    newHostId = currentUserId;
    console.log(`[SYNC_HOST] Room empty, current user is host: ${newHostId}`);
  }

  if (newHostId) {
    console.log(`[SYNC_HOST] Room ${roomCode}: Setting host to ${newHostId}`);
    roomHosts.set(roomCode, newHostId);
  }
}

/**
 * Broadcast full room updates
 */
async function broadcastRoomUpdate(io, roomCode, roomObj = null) {
  try {
    const room = roomObj || (await db.getRoomByCode(roomCode)).result;
    if (!room) return;

    const participantsResult = await db.getParticipants(room.id);
    const tasksResult = await db.getTasks(room.id);
    const timerState = roomTimers.get(roomCode) || {
      timeRemaining: 25 * 60,
      isRunning: false,
      mode: "study",
    };
    const currentHostId = roomHosts.get(roomCode);

    console.log(
      `[BROADCAST] Room ${roomCode}: currentHostId from map = ${currentHostId}`,
    );

    const fullParticipants = (participantsResult.result || []).map((p) => ({
      ...p,
      is_host:
        String(p.user_id).toLowerCase() === String(currentHostId).toLowerCase(),
    }));

    console.log(
      `[BROADCAST] Room ${roomCode}: Participants with is_host flags:`,
      fullParticipants,
    );

    // Send to each user in room with THEIR specific isHost flag
    const sockets = await io.in(roomCode).fetchSockets();
    for (const s of sockets) {
      const isTargetHost =
        String(s.userId).toLowerCase() === String(currentHostId).toLowerCase();
      console.log(
        `[BROADCAST] Sending room:state to socket ${s.id} (userId: ${s.userId}), isHost: ${isTargetHost}`,
      );
      s.emit("room:state", {
        room,
        tasks: tasksResult.result || [],
        participants: fullParticipants,
        timer: getTimerPublicState(timerState),
        isHost: isTargetHost, // AUTHORITATIVE FLAG
      });
    }
  } catch (error) {
    console.error("[BROADCAST_ERROR]", error);
  }
}

/**
 * Handle user leaving or disconnecting
 */
async function handleUserDeparture(io, socket, isExplicit) {
  const { roomCode, userId, username } = socket;
  if (!roomCode || !userId) return;

  try {
    const roomResult = await db.getRoomByCode(roomCode);
    if (roomResult.success) {
      const room = roomResult.result;

      // Log session end
      await db.logSessionEnd(userId, room.id);

      await db.removeParticipant(room.id, userId);

      // Host Cleanup
      const currentHostId = roomHosts.get(roomCode);
      if (
        String(userId).toLowerCase() === String(currentHostId).toLowerCase()
      ) {
        console.log(`[HOST_EXIT] Host ${username} left room ${roomCode}`);

        // Try to find a new host
        const othersResult = await db.getParticipants(room.id);
        const others = othersResult.result || [];
        if (others.length === 0) {
          // Everyone left? Close it.
          console.log(
            `[ROOM_CLOSE] Room ${roomCode} is now empty. Cleaning up.`,
          );
          await db.deleteRoom(room.id);
          stopRoomTimer(roomCode);
          roomTimers.delete(roomCode);
          roomHosts.delete(roomCode);
        } else {
          // Assign new host
          const nextHostId = others[0].user_id;
          roomHosts.set(roomCode, nextHostId);
          await broadcastRoomUpdate(io, roomCode, room);
        }
      } else {
        io.to(roomCode).emit("participant:left", { userId });
        await broadcastRoomUpdate(io, roomCode, room);
      }
    }
    if (isExplicit) socket.leave(roomCode);
  } catch (e) {
    console.error("[EXIT_ERROR]", e);
  }
}

function isAuthoritative(roomCode, userId) {
  const hostId = roomHosts.get(roomCode);
  return String(hostId).toLowerCase() === String(userId).toLowerCase();
}

function startRoomTimer(io, roomCode) {
  const timer = roomTimers.get(roomCode);
  const config = roomTimerConfigs.get(roomCode) || {
    studyDuration: 25 * 60,
    breakDuration: 5 * 60,
  };

  if (!timer) return;
  stopRoomTimer(roomCode);

  timer.intervalId = setInterval(() => {
    if (timer.timeRemaining > 0) {
      timer.timeRemaining--;
      io.to(roomCode).emit("timer:tick", getTimerPublicState(timer));
    } else {
      // Transition to next mode with configured durations
      timer.mode = timer.mode === "study" ? "break" : "study";
      timer.timeRemaining =
        timer.mode === "study" ? config.studyDuration : config.breakDuration;
      timer.totalTime = timer.timeRemaining;
      console.log(
        `[TIMER] Room ${roomCode} transitioned to ${timer.mode} mode (${timer.timeRemaining}s)`,
      );
      io.to(roomCode).emit("timer:transitioned", getTimerPublicState(timer));
    }
  }, 1000);
}

function stopRoomTimer(roomCode) {
  const timer = roomTimers.get(roomCode);
  if (timer && timer.intervalId) {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
  }
}

function getTimerPublicState(timer) {
  return {
    timeRemaining: timer.timeRemaining,
    mode: timer.mode,
    isRunning: timer.isRunning,
    totalTime: timer.totalTime || 25 * 60,
  };
}

module.exports = initSocketHandlers;
