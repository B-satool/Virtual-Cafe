import React, { useState, useEffect, useRef, useCallback } from "react";

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
  const [activeTab, setActiveTab] = useState("tasks");
  const [chatInput, setChatInput] = useState("");
  const [timerDisplay, setTimerDisplay] = useState("25:00");
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [ambientSounds, setAmbientSounds] = useState({
    rain: { enabled: false, volume: 50 },
    cafe: { enabled: false, volume: 50 },
    fireplace: { enabled: false, volume: 50 },
  });
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [timerConfig, setTimerConfig] = useState({
    studyDuration: 25,
    breakDuration: 5,
  });
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTransferUser, setSelectedTransferUser] = useState(null);
  const [notification, setNotification] = useState(null);
  
  const chatEndRef = useRef(null);
  const audioContextRef = useRef(null);
  const activeNodesRef = useRef({});

  // Sync settings modal with room state when it opens
  useEffect(() => {
    if (showTimerSettings) {
      setTimerConfig({
        studyDuration: Math.floor((roomState.studyDuration || 1500) / 60),
        breakDuration: Math.floor((roomState.breakDuration || 300) / 60),
      });
    }
  }, [showTimerSettings, roomState.studyDuration, roomState.breakDuration]);

  // Formatting helpers
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Sync timer display
  useEffect(() => {
    setTimerDisplay(formatTime(roomState.timerSeconds || 1500));
  }, [roomState.timerSeconds]);

  // Audio Synthesis Logic
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
    return audioContextRef.current;
  };

  const startRain = (ctx, gainNode) => {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 800; filter.Q.value = 0.5;
    source.connect(filter); filter.connect(gainNode); gainNode.connect(ctx.destination);
    source.start(0); return source;
  };

  const startCafe = (ctx, gainNode) => {
    const bufferSize = 4 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0); let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02; lastOut = data[i]; data[i] *= 3.5;
    }
    const source = ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 500; filter.Q.value = 0.8;
    source.connect(filter); filter.connect(gainNode); gainNode.connect(ctx.destination);
    source.start(0); return source;
  };

  const startFireplace = (ctx, gainNode) => {
    const bufferSize = 3 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const crackle = Math.random() > 0.997 ? (Math.random() * 2 - 1) * 0.8 : 0;
      const rumble = (Math.random() * 2 - 1) * 0.05; data[i] = crackle + rumble;
    }
    const source = ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1200;
    source.connect(filter); filter.connect(gainNode); gainNode.connect(ctx.destination);
    source.start(0); return source;
  };

  const playBell = () => {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 1);
  };

  // Socket Listeners (for non-chat events)
  useEffect(() => {
    if (!socket) return;
    const handleTaskAdded = (task) => setTasks(prev => [...prev, task]);
    const handleTaskUpdated = (task) => setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    const handleTaskDeleted = (data) => setTasks(prev => prev.filter(t => t.id !== data.taskId));
    const handleRoomState = (data) => { if (data.tasks) setTasks(data.tasks); };
    const handleTimerTransition = () => playBell();
    const handleError = (data) => showNotification(data.message, "error");

    socket.on("task:added", handleTaskAdded);
    socket.on("task:updated", handleTaskUpdated);
    socket.on("task:deleted", handleTaskDeleted);
    socket.on("room:state", handleRoomState);
    socket.on("timer:transitioned", handleTimerTransition);
    socket.on("error", handleError);

    return () => {
      socket.off("task:added", handleTaskAdded);
      socket.off("task:updated", handleTaskUpdated);
      socket.off("task:deleted", handleTaskDeleted);
      socket.off("room:state", handleRoomState);
      socket.off("timer:transitioned", handleTimerTransition);
      socket.off("error", handleError);
    };
  }, [socket]);

  // Ambient Sync
  useEffect(() => {
    const ctx = getAudioContext();
    Object.keys(ambientSounds).forEach((key) => {
      const { enabled, volume } = ambientSounds[key];
      let nodeGroup = activeNodesRef.current[key];
      if (enabled) {
        if (!nodeGroup) {
          const gainNode = ctx.createGain(); gainNode.gain.value = volume / 100;
          let source;
          if (key === 'rain') source = startRain(ctx, gainNode);
          else if (key === 'cafe') source = startCafe(ctx, gainNode);
          else source = startFireplace(ctx, gainNode);
          activeNodesRef.current[key] = { source, gainNode };
        } else nodeGroup.gainNode.gain.value = volume / 100;
      } else if (nodeGroup) {
        nodeGroup.source.stop(); nodeGroup.gainNode.disconnect();
        delete activeNodesRef.current[key];
      }
    });
  }, [ambientSounds]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roomState.chatMessages]);

  // Clean up
  useEffect(() => {
    return () => {
      Object.values(activeNodesRef.current).forEach(group => {
        try { group.source.stop(); group.gainNode.disconnect(); } catch(e) {}
      });
    };
  }, []);

  // Handlers
  const handleSendMessage = (e) => {
    e.preventDefault(); if (!chatInput.trim() || !currentUser) return;
    
    const newMessage = {
      userId: currentUser.id,
      username: currentUser.username,
      message: chatInput,
      timestamp: new Date().toISOString(),
      isOptimistic: true // Flag to identify local messages
    };

    // Optimistically update global UI
    updateRoomState({ chatMessages: [...(roomState.chatMessages || []), newMessage] });
    
    emitEvent("chat:message", {
      roomCode: currentRoom.room_code, userId: currentUser.id, username: currentUser.username,
      message: chatInput, timestamp: newMessage.timestamp,
    });
    setChatInput("");
  };

  const handleAddTask = (e) => {
    e.preventDefault(); if (!newTask.trim()) return;
    emitEvent("task:add", { title: newTask });
    setNewTask("");
  };

  const toggleTask = (taskId, completed) => emitEvent("task:update", { taskId, updates: { completed: !completed } });
  const deleteTask = (taskId) => emitEvent("task:delete", { taskId });

  const handleSaveTimerSettings = () => {
    emitEvent("timer:configure", {
      studyDuration: timerConfig.studyDuration * 60,
      breakDuration: timerConfig.breakDuration * 60,
    });
    setShowTimerSettings(false);
  };

  const updateSound = (key, updates) => setAmbientSounds(prev => ({ ...prev, [key]: { ...prev[key], ...updates } }));

  const isHost = participants.find(p => p.user_id === currentUser?.id)?.is_host;

  return (
    <div className="room-page active">
      <div className="room-header">
        <div className="room-header-left">
          <div className="room-title-section">
            <h1>{currentRoom.room_name}</h1>
            <div id="currentRoomSubtitle">{currentRoom.is_public ? "(Public Room)" : "(Private Room)"}</div>
          </div>
          <div className="room-info-badges">
            <div className="info-box"><div className="info-label">Room Code</div><div className="info-value">{currentRoom.room_code}</div></div>
            <div className="info-box"><div className="info-label">Participants</div><div className="info-value">{participants.length}</div></div>
          </div>
        </div>
        <button className="btn-danger" onClick={() => setShowLeaveConfirm(true)}>Leave Room</button>
      </div>

      <div className="timer-container">
        <div className={`timer-mode ${roomState.timerState}`}>{roomState.timerState === "study" ? "📚 Study Mode" : "☕ Break Mode"}</div>
        <div className="timer-display">{timerDisplay}</div>
        <div className="timer-controls">
          {isHost ? (
            <>
              {roomState.isRunning ? (
                <button className="btn-secondary" onClick={() => emitEvent("timer:pause")}>Pause</button>
              ) : (
                <button className="btn-success" onClick={() => emitEvent("timer:start")}>
                  {roomState.timerSeconds < (roomState.totalTime || 1500) ? "Resume" : "Start Session"}
                </button>
              )}
              <button className="btn-danger" onClick={() => emitEvent("timer:reset")}>Reset</button>
              <button className="btn-secondary" onClick={() => setShowTimerSettings(true)}>⚙️ Settings</button>
            </>
          ) : (
            <div className="participant-wait">📍 Waiting for host to control the timer</div>
          )}
        </div>
        <div className="host-status">{isHost ? "👑 You are the Room Host" : "📍 You are a participant"}</div>
      </div>

      <div className="room-content">
        <div className="tasks-section">
          <div className="content-tabs">
            <button className={`tab-button ${activeTab === "tasks" ? "tab-active" : ""}`} onClick={() => setActiveTab("tasks")}>📝 Shared Tasks</button>
            <button className={`tab-button ${activeTab === "chat" ? "tab-active" : ""}`} onClick={() => setActiveTab("chat")}>💬 Chat</button>
          </div>
          <div className="tab-content">
            {activeTab === "tasks" ? (
              <div id="tasksContent">
                <form className="add-task-form" onSubmit={handleAddTask}>
                  <input type="text" placeholder="Add a shared task..." value={newTask} onChange={(e) => setNewTask(e.target.value)} />
                  <button type="submit">Add Task</button>
                </form>
                <div className="task-list">
                  {tasks.length === 0 ? <div className="empty-state">No tasks.</div> : tasks.map(task => (
                    <div key={task.id} className={`task-item ${task.completed ? "completed" : ""}`}>
                      <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task.id, task.completed)} />
                      <div className="task-text">{task.title}</div>
                      <button className="btn-small btn-danger" onClick={() => deleteTask(task.id)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="chat-container">
                <div className="chat-messages">
                  {(roomState.chatMessages || []).length === 0 ? <div className="empty-state">No messages.</div> : (roomState.chatMessages || []).map((msg, i) => {
                    if (!msg) return null;
                    const msgUserId = msg.userId || msg.user_id;
                    const isOwnMessage = msgUserId === currentUser?.id;
                    return (
                      <div key={i} className={`chat-message ${isOwnMessage ? "own-message" : ""}`}>
                        <div className="chat-user">{msg.username}</div>
                        <div className="chat-text">{msg.message}</div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                <form className="chat-input-form" onSubmit={handleSendMessage}>
                  <input type="text" placeholder="Send a message..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
                  <button type="submit">Send</button>
                </form>
              </div>
            )}
          </div>
        </div>

        <div className="side-panel">
          <div className="participants-section">
            <div className="section-title">👥 Studying Now</div>
            <div className="participant-list">
              {participants.map(p => (
                <div key={p.user_id} className="participant">
                  <div className="participant-avatar">{(p.username || "U").charAt(0).toUpperCase()}</div>
                  <div className="participant-info">
                    <div className="participant-name">{p.username} {p.is_host ? "⭐" : ""}</div>
                    <div className="participant-status">{p.is_host ? "👑 Host" : "Member"}</div>
                  </div>
                  {isHost && p.user_id !== currentUser?.id && (
                    <button className="btn-remove-participant" onClick={() => emitEvent("participant:remove", { userId: p.user_id })}>✕</button>
                  )}
                </div>
              ))}
              {isHost && participants.length > 1 && <button className="btn-secondary btn-full-width" onClick={() => setShowTransferModal(true)}>👑 Transfer Host</button>}
            </div>
          </div>
          <div className="ambient-sounds">
            <div className="ambient-title">🎵 Ambient Sounds</div>
            {Object.keys(ambientSounds).map(key => (
              <div key={key} className="sound-control">
                <label className="sound-label">
                  <input type="checkbox" checked={ambientSounds[key].enabled} onChange={(e) => updateSound(key, { enabled: e.target.checked })} />
                  {key.charAt(0).toUpperCase() + key.slice(1)} {key === 'rain' ? '☔' : key === 'cafe' ? '☕' : '🔥'}
                </label>
                <input type="range" className="sound-volume" min="0" max="100" value={ambientSounds[key].volume} onChange={(e) => updateSound(key, { volume: parseInt(e.target.value) })} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {showTimerSettings && (
        <div className="modal-overlay"><div className="modal">
          <h2>⏱️ Timer Settings</h2>
          <div className="form-group"><label>Study Duration (min)</label><input type="number" value={timerConfig.studyDuration} onChange={(e) => setTimerConfig(prev => ({ ...prev, studyDuration: parseInt(e.target.value) }))} /></div>
          <div className="form-group"><label>Break Duration (min)</label><input type="number" value={timerConfig.breakDuration} onChange={(e) => setTimerConfig(prev => ({ ...prev, breakDuration: parseInt(e.target.value) }))} /></div>
          <div className="modal-buttons"><button className="btn-primary" onClick={handleSaveTimerSettings}>Save</button><button className="btn-secondary" onClick={() => setShowTimerSettings(false)}>Cancel</button></div>
        </div></div>
      )}

      {showLeaveConfirm && (
        <div className="modal-overlay"><div className="modal">
          <h2>Leave Room?</h2><p>Sure you want to leave?</p>
          <div className="modal-buttons"><button className="btn-danger" onClick={leaveRoom}>Yes, Leave</button><button className="btn-secondary" onClick={() => setShowLeaveConfirm(false)}>Cancel</button></div>
        </div></div>
      )}

      {showTransferModal && (
        <div className="modal-overlay"><div className="modal">
          <h2>👑 Transfer Host</h2><p>Select new host:</p>
          <div className="transfer-list">{participants.filter(p => p.user_id !== currentUser?.id).map(p => (<label key={p.user_id} className="transfer-option"><input type="radio" name="newHost" onChange={() => setSelectedTransferUser(p.user_id)} /> {p.username}</label>))}</div>
          <div className="modal-buttons"><button className="btn-primary" disabled={!selectedTransferUser} onClick={() => { emitEvent("host:transfer", { newHostId: selectedTransferUser }); setShowTransferModal(false); }}>Transfer</button><button className="btn-secondary" onClick={() => setShowTransferModal(false)}>Cancel</button></div>
        </div></div>
      )}
      {notification && <div className={`notification ${notification.type}`}>{notification.message}</div>}

      <style>{`
        .room-page { padding: 20px; min-height: 100vh; background: #f5e6d3; font-family: 'Segoe UI', sans-serif; color: #3d3d3d; }
        .room-header { background: white; border-radius: 15px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #d4845c; }
        .room-header-left { display: flex; gap: 40px; align-items: center; }
        .info-box { background: #f9f5f0; padding: 10px 15px; border-radius: 8px; text-align: center; border: 1px solid #e8d4c8; }
        .info-label { font-size: 0.8em; color: #8d6e63; text-transform: uppercase; }
        .info-value { font-size: 1.2em; font-weight: bold; color: #5c4033; }
        .timer-container { background: white; border-radius: 15px; padding: 40px; margin-bottom: 20px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1); text-align: center; border: 2px solid #e8d4c8; }
        .timer-mode { font-size: 1.2em; color: #8d6e63; font-weight: bold; }
        .timer-mode.study { color: #d4845c; } .timer-mode.break { color: #4caf50; }
        .timer-display { font-size: 5em; font-weight: bold; color: #5c4033; font-family: 'Courier New', monospace; margin: 20px 0; }
        .timer-controls { display: flex; gap: 12px; justify-content: center; margin-bottom: 15px; }
        .room-content { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; max-width: 1400px; margin: 0 auto; }
        .tasks-section, .participants-section, .ambient-sounds { background: white; border-radius: 15px; padding: 25px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); border: 1px solid #e8d4c8; }
        .content-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #f5f1ee; }
        .tab-button { padding: 10px 20px; background: none; border: none; color: #8d6e63; font-weight: 600; cursor: pointer; border-bottom: 3px solid transparent; }
        .tab-button.tab-active { color: #5c4033; border-bottom-color: #d4845c; }
        .add-task-form { display: flex; gap: 10px; margin-bottom: 20px; }
        .add-task-form input { flex: 1; padding: 12px; border: 2px solid #e8d4c8; border-radius: 8px; }
        .task-list { height: 400px; overflow-y: auto; }
        .task-item { background: #f9f5f0; padding: 15px; margin-bottom: 10px; border-radius: 8px; display: flex; align-items: center; gap: 15px; }
        .task-item.completed { opacity: 0.6; } .task-text { flex: 1; color: #5c4033; } .completed .task-text { text-decoration: line-through; }
        .chat-container { height: 400px; display: flex; flex-direction: column; }
        .chat-messages { flex: 1; overflow-y: auto; margin-bottom: 10px; }
        .chat-input-form { display: flex; gap: 10px; }
        .chat-input-form input { flex: 1; padding: 10px; border: 2px solid #e8d4c8; border-radius: 8px; }
        .chat-message { margin-bottom: 10px; max-width: 85%; } .own-message { margin-left: auto; text-align: right; }
        .chat-text { background: #f9f5f0; padding: 10px; border-radius: 10px; display: inline-block; border: 1px solid #e8d4c8; }
        .own-message .chat-text { background: #d4845c; color: white; border: none; }
        .participant { display: flex; align-items: center; gap: 12px; padding: 10px; background: #f9f5f0; border-radius: 8px; margin-bottom: 8px; border: 1px solid #e8d4c8; }
        .participant-avatar { width: 35px; height: 35px; background: #d4845c; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
        .sound-control { margin-bottom: 15px; } .sound-label { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; font-weight: 600; }
        .sound-volume { width: 100%; height: 5px; -webkit-appearance: none; background: #e8d4c8; border-radius: 5px; }
        .sound-volume::-webkit-slider-thumb { -webkit-appearance: none; width: 15px; height: 15px; background: #d4845c; border-radius: 50%; cursor: pointer; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal { background: white; padding: 25px; border-radius: 15px; width: 350px; }
        .modal-buttons { display: flex; gap: 10px; margin-top: 20px; }
        button { padding: 10px 15px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; }
        .btn-primary { background: #6d4c41; color: white; } .btn-secondary { background: #8d6e63; color: white; } .btn-danger { background: #d32f2f; color: white; } .btn-success { background: #388e3c; color: white; }
        .notification { position: fixed; bottom: 20px; right: 20px; padding: 15px; border-radius: 8px; color: white; z-index: 2000; }
        .notification.error { background: #d32f2f; }

        @media (max-width: 1024px) {
          .room-content { grid-template-columns: 1fr; }
          .side-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        }

        @media (max-width: 768px) {
          .room-header { flex-direction: column; gap: 15px; text-align: center; }
          .room-header-left { flex-direction: column; gap: 15px; }
          .timer-display { font-size: 3.5em; }
          .side-panel { grid-template-columns: 1fr; }
          .room-page { padding: 10px; }
        }
      `}</style>
    </div>
  );
};

export default RoomPage;
