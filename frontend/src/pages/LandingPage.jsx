import React, { useState, useEffect } from "react";

export const LandingPage = ({
  rooms,
  loadPublicRooms,
  createRoom,
  joinRoom,
  currentUser,
  loading,
  error,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [capacity, setCapacity] = useState(10);
  const [joinCode, setJoinCode] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);

  useEffect(() => {
    loadPublicRooms();
  }, [loadPublicRooms]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    setCreatingRoom(true);
    const result = await createRoom(roomName, isPrivate, capacity);
    if (result) {
      setShowCreateModal(false);
      setRoomName("");
      setIsPrivate(false);
      setCapacity(10);
    }
    setCreatingRoom(false);
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoiningRoom(true);
    const result = await joinRoom(joinCode);
    if (result) {
      setShowJoinModal(false);
      setJoinCode("");
    }
    setJoiningRoom(false);
  };

  const handleJoinFromList = async (room) => {
    if (room.is_private) {
      alert("This is a private room. Please use the join code.");
      return;
    }
    setJoiningRoom(true);
    await joinRoom(room.room_code);
    setJoiningRoom(false);
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <h1>☕ Virtual Café</h1>
        <div className="user-info">
          <span>Welcome, {currentUser?.username || "Guest"}</span>
        </div>
      </header>

      <main className="landing-content">
        <div className="action-buttons">
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Create New Room
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowJoinModal(true)}
          >
            🔓 Join with Code
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <section className="rooms-section">
          <h2>Available Rooms</h2>
          {loading ? (
            <p className="loading">Loading rooms...</p>
          ) : rooms.length === 0 ? (
            <p className="no-rooms">
              No public rooms available. Create one to get started!
            </p>
          ) : (
            <div className="rooms-grid">
              {rooms.map((room) => (
                <div key={room.id} className="room-card">
                  <div className="room-header">
                    <h3>{room.name}</h3>
                    <span
                      className={`room-status ${room.is_private ? "private" : "public"}`}
                    >
                      {room.is_private ? "🔒 Private" : "🌐 Public"}
                    </span>
                  </div>
                  <div className="room-details">
                    <p>
                      <strong>Code:</strong> {room.room_code}
                    </p>
                    <p>
                      <strong>Participants:</strong>{" "}
                      {room.participant_count || 0} / {room.capacity}
                    </p>
                  </div>
                  <button
                    className="btn btn-small"
                    onClick={() => handleJoinFromList(room)}
                    disabled={
                      joiningRoom || room.participant_count >= room.capacity
                    }
                  >
                    {room.participant_count >= room.capacity
                      ? "Room Full"
                      : "Join"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={() => !creatingRoom && setShowCreateModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Room</h2>
              <button
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateRoom}>
              <div className="form-group">
                <label>Room Name</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="My Study Room"
                  required
                />
              </div>
              <div className="form-group">
                <label>Capacity</label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value))}
                  min="2"
                  max="50"
                  required
                />
              </div>
              <div className="form-group checkbox">
                <input
                  type="checkbox"
                  id="private"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                <label htmlFor="private">Make this a private room</label>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creatingRoom}
              >
                {creatingRoom ? "Creating..." : "Create Room"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinModal && (
        <div
          className="modal-overlay"
          onClick={() => !joiningRoom && setShowJoinModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Join Room</h2>
              <button
                className="close-btn"
                onClick={() => setShowJoinModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleJoinRoom}>
              <div className="form-group">
                <label>Room Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={joiningRoom}
              >
                {joiningRoom ? "Joining..." : "Join Room"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .landing-page {
          min-height: 100vh;
          background: #f5f5f5;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .landing-header {
          background: white;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .landing-header h1 {
          margin: 0;
          font-size: 1.8rem;
        }

        .user-info {
          color: #666;
        }

        .landing-content {
          max-width: 1200px;
          margin: 40px auto;
          padding: 0 20px;
        }

        .action-buttons {
          display: flex;
          gap: 15px;
          margin-bottom: 40px;
        }

        .btn {
          padding: 12px 20px;
          border: none;
          border-radius: 5px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-secondary {
          background: #fff;
          color: #667eea;
          border: 2px solid #667eea;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-small {
          padding: 8px 16px;
          font-size: 0.9rem;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
          border-left: 4px solid #c33;
        }

        .rooms-section {
          margin-top: 40px;
        }

        .rooms-section h2 {
          margin-bottom: 20px;
          color: #333;
        }

        .loading,
        .no-rooms {
          text-align: center;
          color: #999;
          padding: 40px 20px;
          font-size: 1.1rem;
        }

        .rooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .room-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .room-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .room-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 15px;
        }

        .room-header h3 {
          margin: 0;
          color: #333;
          flex: 1;
        }

        .room-status {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .room-status.public {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .room-status.private {
          background: #f3e5f5;
          color: #6a1b9a;
        }

        .room-details {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 15px;
        }

        .room-details p {
          margin: 5px 0;
        }

        /* Modal Styles */
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
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

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
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #333;
          font-weight: 600;
        }

        .form-group input {
          width: 100%;
          padding: 10px;
          border: 2px solid #e0e0e0;
          border-radius: 5px;
          font-size: 1rem;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .form-group.checkbox {
          display: flex;
          align-items: center;
        }

        .form-group.checkbox input {
          width: auto;
          margin-right: 10px;
        }

        .form-group.checkbox label {
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
