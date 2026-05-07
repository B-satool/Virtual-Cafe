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

      sock.on("connect", () => {
        setIsConnected(true);
        setSocketError(null);
        if (roomCode) {
          sock.emit("room:join", { roomCode, userId, username });
        }
      });

      sock.on("disconnect", () => setIsConnected(false));
      sock.on("connect_error", (error) => setSocketError(error.message));
      sock.on("error", (data) => {
        if (handlers.onError) handlers.onError(data);
      });

      // Room events
      if (handlers.onParticipantJoined) sock.on("participant:joined", handlers.onParticipantJoined);
      if (handlers.onParticipantLeft) sock.on("participant:left", handlers.onParticipantLeft);
      if (handlers.onRoomClosed) sock.on("room:closed", handlers.onRoomClosed);
      
      sock.on("room:state", (data) => {
        if (handlers.onRoomState) handlers.onRoomState(data);
      });

      // Timer events - Map all to handlers
      sock.on("timer:tick", (data) => handlers.onTimerUpdate && handlers.onTimerUpdate(data));
      sock.on("timer:started", (data) => handlers.onTimerUpdate && handlers.onTimerUpdate(data));
      sock.on("timer:paused", (data) => handlers.onTimerUpdate && handlers.onTimerUpdate(data));
      sock.on("timer:resumed", (data) => handlers.onTimerUpdate && handlers.onTimerUpdate(data));
      sock.on("timer:reset", (data) => handlers.onTimerUpdate && handlers.onTimerUpdate(data));
      sock.on("timer:transitioned", (data) => handlers.onTimerUpdate && handlers.onTimerUpdate(data));
      sock.on("timer:configured", (data) => handlers.onTimerConfigured && handlers.onTimerConfigured(data));

      // Task events
      sock.on("task:added", (data) => handlers.onTaskAdded && handlers.onTaskAdded(data));
      sock.on("task:updated", (data) => handlers.onTaskUpdated && handlers.onTaskUpdated(data));
      sock.on("task:deleted", (data) => handlers.onTaskDeleted && handlers.onTaskDeleted(data));

      // Chat events
      sock.on("chat:history", (data) => handlers.onChatHistory && handlers.onChatHistory(data));
      sock.on("chat:message", (data) => handlers.onChatMessage && handlers.onChatMessage(data));
    },
    [roomCode, userId, username],
  );

  const initializeSocket = useCallback(
    (handlers = {}) => {
      if (socketRef.current) socketRef.current.disconnect();
      const newSocket = io(window.location.origin);
      setupSocketListeners(newSocket, handlers);
      socketRef.current = newSocket;
      setSocket(newSocket);
      return newSocket;
    },
    [setupSocketListeners],
  );

  const emitEvent = useCallback((event, data) => {
    if (socketRef.current?.connected) {
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

  return {
    socket: socketRef.current,
    isConnected,
    socketError,
    initializeSocket,
    emitEvent,
    disconnectSocket,
  };
};
