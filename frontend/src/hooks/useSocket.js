import { useEffect, useState, useCallback, useRef } from "react";
import io from "socket.io-client";

export const useSocket = (userId, roomCode, username = "") => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState(null);
  const socketRef = useRef(null);

  const setupSocketListeners = useCallback(
    (sock, handlers) => {
      if (!sock) return;

      // Connection events
      sock.on("connect", () => {
        setIsConnected(true);
        setSocketError(null);
        if (roomCode) {
          console.log(
            `[useSocket] Connected, emitting room:join with roomCode=${roomCode}, userId=${userId}, username=${username}`,
          );
          sock.emit("room:join", {
            roomCode: roomCode,
            userId: userId,
            username: username,
          });
        }
      });

      sock.on("disconnect", () => {
        setIsConnected(false);
      });

      sock.on("connect_error", (error) => {
        setSocketError(error.message);
      });

      // Room events
      if (handlers.onParticipantJoined) {
        sock.on("participant:joined", handlers.onParticipantJoined);
      }
      if (handlers.onParticipantLeft) {
        sock.on("participant:left", handlers.onParticipantLeft);
      }
      if (handlers.onRoomClosed) {
        sock.on("room:closed", handlers.onRoomClosed);
      }
      if (handlers.onParticipantsUpdate) {
        sock.on("room:state", (data) => {
          console.log("[useSocket] Received room:state event:", data);
          handlers.onParticipantsUpdate(data);
        });
      }

      // Timer events
      if (handlers.onTimerStart) {
        sock.on("timer:started", handlers.onTimerStart);
      }
      if (handlers.onTimerTick) {
        sock.on("timer:tick", handlers.onTimerTick);
      }
      if (handlers.onTimerPause) {
        sock.on("timer:paused", handlers.onTimerPause);
      }
      if (handlers.onTimerResume) {
        sock.on("timer:resumed", handlers.onTimerResume);
      }
      if (handlers.onTimerTransition) {
        sock.on("timer:transitioned", handlers.onTimerTransition);
      }

      // Task events
      if (handlers.onTaskAdded) {
        sock.on("task:added", handlers.onTaskAdded);
      }
      if (handlers.onTaskUpdated) {
        sock.on("task:updated", handlers.onTaskUpdated);
      }
      if (handlers.onTaskDeleted) {
        sock.on("task:deleted", handlers.onTaskDeleted);
      }
      if (handlers.onTasksSync) {
        sock.on("tasks:sync", handlers.onTasksSync);
      }
    },
    [roomCode, userId, username],
  );

  const initializeSocket = useCallback(
    (handlers = {}) => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const newSocket = io(window.location.origin, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      setupSocketListeners(newSocket, handlers);
      socketRef.current = newSocket;
      setSocket(newSocket);
      return newSocket;
    },
    [setupSocketListeners],
  );

  const emitEvent = useCallback((event, data) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

  return {
    socket: socketRef.current,
    isConnected,
    socketError,
    initializeSocket,
    emitEvent,
    disconnectSocket,
  };
};
