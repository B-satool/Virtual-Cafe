import React, { useState, useEffect, useRef } from "react";

export const RoomPage = ({
  currentRoom,
  currentUser,
  participants,
  roomState,
  leaveRoom,
  updateRoomState,
  socket,
  emitEvent,
}) => {
  const [timerDisplay, setTimerDisplay] = useState("25:00");
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [ambientSound, setAmbientSound] = useState("none");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTransferUser, setSelectedTransferUser] = useState(null);
  const [notification, setNotification] = useState(null);
  const [localParticipants, setLocalParticipants] = useState(
    participants || [],
  );
  const audioRef = useRef(null);

  // Log all incoming props
  console.log("[RoomPage] Received props:", {
    participantCount: participants?.length,
    participants: participants,
    currentUserId: currentUser?.id,
    currentUsername: currentUser?.username,
    roomCode: currentRoom?.room_code,
  });

  // Show notification
  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Update timer display when roomState changes
  useEffect(() => {
    setTimerDisplay(formatTime(roomState.timerSeconds || 1500));
  }, [roomState.timerSeconds]);

  // Load tasks from localStorage or backend
  useEffect(() => {
    const loadTasks = async () => {
      if (currentRoom?.id) {
        try {
          const res = await fetch(`/api/tasks/${currentRoom.id}`);
          const data = await res.json();
          if (res.ok) {
            setTasks(data.tasks || []);
          }
        } catch (err) {
          console.error("Failed to load tasks:", err);
        }
      }
    };
    loadTasks();
  }, [currentRoom?.id]);

  // Sync localParticipants whenever the participants prop changes
  useEffect(() => {
    if (participants && Array.isArray(participants)) {
      console.log("[RoomPage] participants prop updated:", participants);
      console.log("[RoomPage] currentUser:", currentUser);
      setLocalParticipants(participants);
    }
  }, [participants, currentUser]);

  // Listen for socket events (timer, tasks, room state, notifications)
  useEffect(() => {
    if (!socket) return;

    socket.on("timer:tick", (data) => {
      updateRoomState({ timerSeconds: data.seconds });
    });

    socket.on("timer:started", () => {
      setIsTimerRunning(true);
    });

    socket.on("timer:paused", () => {
      setIsTimerRunning(false);
    });

    socket.on("timer:resumed", () => {
      setIsTimerRunning(true);
    });

    socket.on("timer:transitioned", (data) => {
      updateRoomState({
        timerState: data.newState,
        timerSeconds: data.seconds,
      });
      setIsTimerRunning(true);
    });

    socket.on("task:added", (data) => {
      setTasks((prev) => [...prev, data.task]);
    });

    socket.on("task:updated", (data) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === data.task.id ? data.task : t)),
      );
    });

    socket.on("task:deleted", (data) => {
      setTasks((prev) => prev.filter((t) => t.id !== data.taskId));
    });

    socket.on("room:closed", () => {
      alert("The room has been closed by the host.");
      leaveRoom();
    });

    socket.on("host:transferred", (data) => {
      showNotification("Host role transferred successfully", "success");
      setShowTransferModal(false);
    });

    socket.on("participant:removed", (data) => {
      showNotification(
        data.reason || "You were removed from the room",
        "warning",
      );
      setTimeout(() => {
        leaveRoom();
      }, 2000);
    });

    socket.on("participant:removed_from_room", (data) => {
      showNotification(`${data.userId} has been removed from the room`, "info");
    });

    socket.on("error", (data) => {
      showNotification(data.message, "error");
    });

    return () => {
      socket.off("timer:tick");
      socket.off("timer:started");
      socket.off("timer:paused");
      socket.off("timer:resumed");
      socket.off("timer:transitioned");
      socket.off("task:added");
      socket.off("task:updated");
      socket.off("task:deleted");
      socket.off("room:closed");
      socket.off("host:transferred");
      socket.off("participant:removed");
      socket.off("participant:removed_from_room");
      socket.off("error");
    };
  }, [socket, updateRoomState, leaveRoom]);

  // Handle timer controls
  const handleStartTimer = () => {
    if (!isTimerRunning) {
      emitEvent("timer:start", { room_code: currentRoom.room_code });
      setIsTimerRunning(true);
    }
  };

  const handlePauseTimer = () => {
    if (isTimerRunning) {
      emitEvent("timer:pause", { room_code: currentRoom.room_code });
      setIsTimerRunning(false);
    }
  };

  const handleResetTimer = () => {
    emitEvent("timer:reset", { room_code: currentRoom.room_code });
    setIsTimerRunning(false);
  };

  // Handle task management
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    emitEvent("task:add", {
      room_code: currentRoom.room_code,
      description: newTask,
      user_id: currentUser?.id,
    });
    setNewTask("");
  };

  const handleToggleTask = (taskId, completed) => {
    emitEvent("task:update", {
      room_code: currentRoom.room_code,
      taskId,
      updates: { completed: !completed },
    });
  };

  const handleDeleteTask = (taskId) => {
    emitEvent("task:delete", {
      room_code: currentRoom.room_code,
      taskId,
    });
  };

  // Handle host transfer
  const handleTransferHost = () => {
    if (!selectedTransferUser) {
      showNotification("Please select a participant", "error");
      return;
    }

    emitEvent("host:transfer", {
      room_code: currentRoom.room_code,
      newHostId: selectedTransferUser,
    });
  };

  // Handle participant removal
  const handleRemoveParticipant = (userId) => {
    if (!window.confirm("Are you sure you want to remove this participant?")) {
      return;
    }

    emitEvent("participant:remove", {
      room_code: currentRoom.room_code,
      userId,
    });
  };

  // Handle ambient sound
  const handleSoundChange = (sound) => {
    setAmbientSound(sound);
    localStorage.setItem("ambientSound", sound);

    if (audioRef.current) {
      if (sound === "none") {
        audioRef.current.pause();
      } else {
        // Audio sources would be configured based on sound selection
        // This is a placeholder for the actual audio implementation
        audioRef.current
          .play()
          .catch((err) => console.log("Audio play failed:", err));
      }
    }
  };

  const handleLeaveRoom = () => {
    if (currentRoom?.participant_count === 1) {
      // User is the last one (likely the host)
      emitEvent("room:leave", {
        room_code: currentRoom.room_code,
        user_id: currentUser?.id,
      });
    } else {
      emitEvent("room:leave", {
        room_code: currentRoom.room_code,
        user_id: currentUser?.id,
      });
    }
    leaveRoom();
  };

  if (!currentRoom) {
    return <div className="room-page">Loading...</div>;
  }

  // Check if current user is the host based on the participants array
  const isHost =
    localParticipants &&
    localParticipants.some(
      (p) =>
        p.is_host &&
        String(p.user_id).toLowerCase() ===
          String(currentUser?.id).toLowerCase(),
    );

  // Diagnostic logging
  console.log("[RoomPage] Render — isHost evaluation:", {
    isHost,
    localParticipantsCount: localParticipants?.length,
    currentUserId: currentUser?.id,
    hostParticipant: localParticipants?.find((p) => p.is_host),
    allParticipants: localParticipants,
  });

  return (
    <div className="room-page">
      <header className="room-header">
        <div className="room-title">
          <h1>{currentRoom.name}</h1>
          <span className="room-code">Code: {currentRoom.room_code}</span>
        </div>
        <button
          className="btn btn-danger"
          onClick={() => setShowLeaveConfirm(true)}
        >
          Leave Room
        </button>
      </header>

      <div className="room-content">
        {/* Left Panel - Timer and Controls */}
        <div className="left-panel">
          <div className="timer-container">
            <div className="timer-display">
              <span className={`timer ${roomState.timerState}`}>
                {timerDisplay}
              </span>
              <p className="timer-mode">{roomState.timerState}</p>
            </div>

            <div className="timer-controls">
              <button
                className="btn btn-timer"
                onClick={handleStartTimer}
                disabled={isTimerRunning}
              >
                ▶ Start
              </button>
              <button
                className="btn btn-timer"
                onClick={handlePauseTimer}
                disabled={!isTimerRunning}
              >
                ⏸ Pause
              </button>
              <button className="btn btn-timer" onClick={handleResetTimer}>
                🔄 Reset
              </button>
            </div>
          </div>

          {/* Ambient Sound Controls */}
          <div className="ambient-section">
            <h3>🎵 Ambient Sound</h3>
            <div className="sound-buttons">
              {["none", "coffee-shop", "rain", "forest"].map((sound) => (
                <button
                  key={sound}
                  className={`sound-btn ${ambientSound === sound ? "active" : ""}`}
                  onClick={() => handleSoundChange(sound)}
                  title={sound.replace("-", " ")}
                >
                  {sound === "none"
                    ? "🔇"
                    : sound === "coffee-shop"
                      ? "☕"
                      : sound === "rain"
                        ? "🌧️"
                        : "🌲"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Panel - Tasks */}
        <div className="center-panel">
          <h2>📝 Tasks</h2>

          <form onSubmit={handleAddTask} className="task-form">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a new task..."
              className="task-input"
            />
            <button type="submit" className="btn btn-small">
              Add
            </button>
          </form>

          <div className="tasks-list">
            {tasks.length === 0 ? (
              <p className="no-tasks">No tasks yet. Add one to get started!</p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`task-item ${task.completed ? "completed" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={task.completed || false}
                    onChange={() => handleToggleTask(task.id, task.completed)}
                    className="task-checkbox"
                  />
                  <span className="task-text">{task.description}</span>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Participants */}
        <div className="right-panel">
          <h2>👥 Participants ({localParticipants.length})</h2>
          {isHost && (
            <button
              className="btn btn-primary btn-small"
              onClick={() => setShowTransferModal(true)}
              style={{ marginBottom: "15px", width: "100%" }}
            >
              👑 Transfer Host
            </button>
          )}
          <div className="participants-list">
            {localParticipants.map((participant) => (
              <div
                key={participant.user_id}
                className={`participant ${participant.is_host ? "host" : ""}`}
              >
                <div className="participant-info">
                  <div>
                    <span className="participant-name">
                      {participant.username}
                      {participant.is_host && (
                        <span className="host-badge">👑 Host</span>
                      )}
                    </span>
                  </div>
                  {isHost && !participant.is_host && (
                    <div className="host-controls">
                      <button
                        className="btn-action btn-remove"
                        onClick={() =>
                          handleRemoveParticipant(participant.user_id)
                        }
                        title="Remove this participant"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Transfer Host Modal */}
      {showTransferModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowTransferModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👑 Transfer Host Role</h2>
              <button
                className="close-btn"
                onClick={() => setShowTransferModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <p>Select a participant to transfer the host role to:</p>
              <div className="participant-selector">
                {participants
                  .filter((p) => !p.is_host)
                  .map((participant) => (
                    <button
                      key={participant.user_id}
                      className={`participant-option ${selectedTransferUser === participant.user_id ? "selected" : ""}`}
                      onClick={() =>
                        setSelectedTransferUser(participant.user_id)
                      }
                    >
                      {participant.username}
                    </button>
                  ))}
              </div>
              {localParticipants.filter((p) => !p.is_host).length === 0 && (
                <p style={{ color: "#999", textAlign: "center" }}>
                  No other participants available
                </p>
              )}
            </div>
            <div className="modal-buttons">
              <button
                className="btn btn-primary"
                onClick={handleTransferHost}
                disabled={!selectedTransferUser}
              >
                Transfer
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowTransferModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div
          className="modal-overlay"
          onClick={() => setShowLeaveConfirm(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Leave Room?</h2>
            {isHost && (
              <p style={{ color: "#c33", marginBottom: "15px" }}>
                ⚠️ You are the host. The room will be deleted when you leave.
              </p>
            )}
            <div className="modal-buttons">
              <button className="btn btn-primary" onClick={handleLeaveRoom}>
                Yes, Leave
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowLeaveConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} loop />

      <style>{`
        .room-page {
          min-height: 100vh;
          background: #f5f5f5;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .room-header {
          background: white;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .room-title h1 {
          margin: 0;
          color: #333;
        }

        .room-code {
          display: block;
          color: #999;
          font-size: 0.9rem;
          margin-top: 5px;
        }

        .room-content {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          gap: 20px;
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .left-panel, .center-panel, .right-panel {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        /* Timer styles */
        .timer-container {
          text-align: center;
          margin-bottom: 30px;
        }

        .timer-display {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .timer {
          font-size: 4rem;
          font-weight: bold;
          display: block;
          font-family: 'Courier New', monospace;
        }

        .timer-mode {
          margin: 10px 0 0 0;
          font-size: 1rem;
          opacity: 0.9;
        }

        .timer-controls {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .btn-timer {
          padding: 10px;
          font-size: 0.9rem;
        }

        /* Ambient Sound */
        .ambient-section {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }

        .ambient-section h3 {
          margin-top: 0;
          color: #333;
        }

        .sound-buttons {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .sound-btn {
          padding: 15px;
          border: 2px solid #e0e0e0;
          border-radius: 5px;
          background: white;
          cursor: pointer;
          font-size: 1.5rem;
          transition: all 0.3s ease;
        }

        .sound-btn:hover {
          border-color: #667eea;
          background: #f5f5f5;
        }

        .sound-btn.active {
          border-color: #667eea;
          background: #f0f4ff;
        }

        /* Tasks */
        .center-panel h2 {
          margin-top: 0;
          color: #333;
        }

        .task-form {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .task-input {
          flex: 1;
          padding: 10px;
          border: 2px solid #e0e0e0;
          border-radius: 5px;
          font-size: 1rem;
        }

        .task-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .tasks-list {
          max-height: 500px;
          overflow-y: auto;
        }

        .task-item {
          display: flex;
          align-items: center;
          padding: 12px;
          background: #f9f9f9;
          border-radius: 5px;
          margin-bottom: 8px;
          transition: all 0.3s ease;
        }

        .task-item:hover {
          background: #f0f0f0;
        }

        .task-item.completed .task-text {
          text-decoration: line-through;
          color: #999;
        }

        .task-checkbox {
          margin-right: 10px;
          cursor: pointer;
          width: 18px;
          height: 18px;
        }

        .task-text {
          flex: 1;
          word-break: break-word;
        }

        .btn-delete {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 1rem;
          padding: 5px;
        }

        .btn-delete:hover {
          color: #c33;
        }

        .no-tasks {
          text-align: center;
          color: #999;
          padding: 30px 20px;
        }

        /* Participants */
        .right-panel h2 {
          margin-top: 0;
          color: #333;
        }

        .participants-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .participant {
          padding: 12px;
          background: #f9f9f9;
          border-radius: 5px;
          border-left: 4px solid #e0e0e0;
        }

        .participant.host {
          border-left-color: #ffc107;
          background: #fffbf0;
        }

        .participant-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .participant-name {
          font-weight: 500;
          color: #333;
        }

        .host-badge {
          font-size: 0.8rem;
          margin-left: 8px;
        }

        /* Buttons */
        .btn {
          padding: 10px 15px;
          border: none;
          border-radius: 5px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-danger {
          background: #e74c3c;
          color: white;
        }

        .btn-danger:hover {
          background: #c0392b;
        }

        .btn-secondary {
          background: #ecf0f1;
          color: #333;
          border: 1px solid #bdc3c7;
        }

        .btn-secondary:hover {
          background: #d5dbdb;
        }

        .btn-small {
          padding: 8px 12px;
          font-size: 0.85rem;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover {
          background: #5568d3;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          padding: 30px;
          border-radius: 8px;
          max-width: 400px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .modal h2 {
          margin-top: 0;
          color: #333;
        }

        .modal-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 20px;
        }

        /* Notifications */
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 15px 20px;
          border-radius: 5px;
          color: white;
          font-weight: 600;
          z-index: 2000;
          animation: slideIn 0.3s ease-out;
        }

        .notification-info {
          background: #3498db;
        }

        .notification-success {
          background: #27ae60;
        }

        .notification-error {
          background: #e74c3c;
        }

        .notification-warning {
          background: #f39c12;
        }

        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Host Controls */
        .host-controls {
          display: flex;
          gap: 8px;
        }

        .btn-action {
          background: none;
          border: none;
          padding: 5px 10px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          border-radius: 3px;
        }

        .btn-remove {
          color: #e74c3c;
          font-weight: bold;
        }

        .btn-remove:hover {
          background: #fee;
        }

        /* Participant Selector */
        .participant-selector {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          margin: 15px 0;
          max-height: 300px;
          overflow-y: auto;
        }

        .participant-option {
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 5px;
          background: white;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
        }

        .participant-option:hover {
          border-color: #667eea;
          background: #f0f4ff;
        }

        .participant-option.selected {
          border-color: #667eea;
          background: #667eea;
          color: white;
          font-weight: 600;
        }

        /* Modal Header */
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h2 {
          margin: 0;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
          padding: 0;
        }

        .close-btn:hover {
          color: #333;
        }

        /* Modal Content */
        .modal-content {
          margin-bottom: 20px;
        }

        .modal-content p {
          color: #666;
          margin: 0 0 15px 0;
        }

        @media (max-width: 1024px) {
          .room-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default RoomPage;
