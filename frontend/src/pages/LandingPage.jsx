import React, { useState, useEffect } from "react";

export const LandingPage = ({
  rooms,
  loadPublicRooms,
  createRoom,
  joinRoom,
  currentUser,
  loading,
  error,
  logout,
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
        <div className="header-left">
          <h1>☕ Virtual Café</h1>
          <div className="user-info">
            <span>Welcome, {currentUser?.username || "Guest"}</span>
          </div>
        </div>
        <div className="header-buttons">
          <button className="btn btn-primary" title="View your profile and session history">
            👤 Dashboard
          </button>
          <button className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
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
          ) : rooms && rooms.length === 0 ? (
            <p className="no-rooms">
              No public rooms available. Create one to get started!
            </p>
          ) : (
            <div className="rooms-grid">
              {rooms && rooms.map((room) => (
                <div key={room.id} className="room-card">
                  <div className="room-header">
                    <h3>{room.room_name || room.name}</h3>
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
                      <strong>Capacity:</strong> {room.capacity}
                    </p>
                  </div>
                  <button
                    className="btn btn-small"
                    onClick={() => handleJoinFromList(room)}
                    disabled={joiningRoom}
                  >
                    Join
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
          background: linear-gradient(135deg, #f5e6d3 0%, #e8cdb3 100%);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .landing-header {
          background: white;
          padding: 20px 40px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #d4845c;
          gap: 20px;
        }

        .header-left {
          flex: 1;
        }

        .landing-header h1 {
          font-size: 1.8em;
          color: #5c4033;
          margin: 0 0 5px 0;
        }

        .user-info {
          color: #8d6e63;
          font-weight: 500;
          font-size: 0.95em;
        }

        .header-buttons {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .header-buttons .btn {
          padding: 10px 16px;
          font-size: 0.95em;
          white-space: nowrap;
        }

        .header-buttons .btn-primary {
          background: linear-gradient(135deg, #d4845c 0%, #c9703a 100%);
          color: white;
        }

        .header-buttons .btn-secondary {
          background: #8d6e63;
          color: white;
          border: none;
        }

        .header-buttons .btn-secondary:hover {
          background: #7d5e5a;
        }

        .landing-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .action-buttons {
          display: flex;
          gap: 15px;
          margin-bottom: 40px;
          flex-wrap: wrap;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 1em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #d4845c 0%, #c9703a 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(212, 132, 92, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(212, 132, 92, 0.4);
        }

        .btn-secondary {
          background: white;
          color: #d4845c;
          border: 2px solid #d4845c;
          box-shadow: 0 4px 12px rgba(212, 132, 92, 0.15);
        }

        .btn-secondary:hover {
          background: #fef9f6;
          transform: translateY(-2px);
        }

        .rooms-section {
          margin-top: 40px;
        }

        .rooms-section h2 {
          font-size: 1.8em;
          color: #5c4033;
          margin-bottom: 25px;
        }

        .rooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .room-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
        }

        .room-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
        }

        .room-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 12px;
        }

        .room-header h3 {
          margin: 0;
          color: #5c4033;
          font-size: 1.2em;
        }

        .room-status {
          font-size: 0.8em;
          padding: 4px 12px;
          border-radius: 6px;
          background: #f0f0f0;
          color: #666;
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
          margin-bottom: 15px;
          color: #8d6e63;
        }

        .room-details p {
          margin: 8px 0;
          font-size: 0.95em;
        }

        .btn-small {
          width: 100%;
          padding: 10px;
          background: linear-gradient(135deg, #d4845c 0%, #c9703a 100%);
          color: white;
          border-radius: 6px;
          font-size: 0.95em;
        }

        .btn-small:hover {
          transform: translateY(-2px);
        }

        .error-message {
          background: #ffebee;
          color: #c62828;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border-left: 4px solid #c62828;
        }

        .loading, .no-rooms {
          text-align: center;
          color: #8d6e63;
          font-size: 1.1em;
          padding: 40px;
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
          border-radius: 12px;
          padding: 30px;
          max-width: 500px;
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
          color: #5c4033;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 2em;
          color: #999;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          color: #333;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #5c4033;
          font-weight: 600;
        }

        .form-group input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0d5ce;
          border-radius: 6px;
          font-size: 1em;
          box-sizing: border-box;
          transition: border-color 0.3s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #d4845c;
        }

        .form-group.checkbox {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .form-group.checkbox input {
          width: auto;
          margin: 0;
        }

        .form-group.checkbox label {
          margin: 0;
        }

        @media (max-width: 768px) {
          .landing-header {
            flex-direction: column;
            gap: 10px;
            text-align: center;
          }

          .action-buttons {
            flex-direction: column;
          }

          .rooms-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
