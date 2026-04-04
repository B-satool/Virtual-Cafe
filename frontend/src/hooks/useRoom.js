import { useState, useCallback, useEffect } from "react";

export const useRoom = (userId) => {
  const [currentRoom, setCurrentRoom] = useState(() => {
    const stored = localStorage.getItem("currentRoom");
    return stored ? JSON.parse(stored) : null;
  });
  const [rooms, setRooms] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [roomState, setRoomState] = useState({
    timerState: "STUDY",
    timerSeconds: 1500,
    tasks: [],
    ambientSound: "none",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createRoom = useCallback(
    async (roomName, isPrivate = false, capacity = 10) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/rooms/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: roomName,
            isPrivate,
            capacity,
            created_by: userId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create room");

        const newRoom = data.room;
        localStorage.setItem("currentRoom", JSON.stringify(newRoom));
        localStorage.setItem(
          "currentUsername",
          localStorage.getItem("username") || "Anonymous",
        );
        setCurrentRoom(newRoom);
        return newRoom;
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  const joinRoom = useCallback(
    async (roomCode) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/rooms/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_code: roomCode,
            user_id: userId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to join room");

        const room = data.room;
        localStorage.setItem("currentRoom", JSON.stringify(room));
        localStorage.setItem(
          "currentUsername",
          localStorage.getItem("username") || "Anonymous",
        );
        setCurrentRoom(room);
        return room;
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  const leaveRoom = useCallback(() => {
    localStorage.removeItem("currentRoom");
    localStorage.removeItem("currentUsername");
    setCurrentRoom(null);
    setParticipants([]);
    setRoomState({
      timerState: "STUDY",
      timerSeconds: 1500,
      tasks: [],
      ambientSound: "none",
    });
  }, []);

  const loadPublicRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms/public");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load rooms");
      setRooms(data.rooms || []);
    } catch (err) {
      setError(err.message);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRoomState = useCallback((updates) => {
    setRoomState((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateCurrentRoom = useCallback((room) => {
    console.log("[useRoom] updateCurrentRoom called with:", room);
    setCurrentRoom(room);
    if (room) {
      localStorage.setItem("currentRoom", JSON.stringify(room));
    }
  }, []);

  const updateParticipants = useCallback((newParticipants) => {
    console.log("[useRoom] updateParticipants called with:", newParticipants);
    setParticipants(newParticipants);
  }, []);

  return {
    currentRoom,
    rooms,
    participants,
    roomState,
    loading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    loadPublicRooms,
    updateRoomState,
    updateCurrentRoom,
    updateParticipants,
    setRoomState,
  };
};
