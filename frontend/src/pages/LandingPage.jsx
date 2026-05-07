import React, { useState, useEffect } from "react";
import { profileAPI, adminAPI } from "../utils/api";

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
  const [roomName, setRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [capacity, setCapacity] = useState(10);
  const [joinCode, setJoinCode] = useState("");
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    loadPublicRooms();
  }, [loadPublicRooms]);

  const handleShowProfile = async () => {
    setShowProfile(true);
    try {
      const data = await profileAPI.getProfile();
      if (data.success) {
        setProfileData(data.result);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  };

  const handleShowAdmin = async () => {
    setShowAdminPanel(true);
    fetchUsers();
  };

  const fetchUsers = async () => {
    setAdminLoading(true);
    try {
      const data = await adminAPI.getAllUsers();
      if (data.success) {
        setAllUsers(data.result);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      const data = await adminAPI.deleteUser(userId);
      if (data.success) {
        setAllUsers(allUsers.filter(u => u.id !== userId));
      }
    } catch (err) {
      alert("Failed to delete user: " + err.message);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    setCreatingRoom(true);
    // Note: useRoom hook was updated to accept isPrivate, but we use isPublic here
    // The hook will invert it. Wait, the hook I just edited takes isPrivate as 2nd arg?
    // Let me check useRoom.js again.
    const result = await createRoom(roomName, !isPublic, capacity);
    if (result) {
      setRoomName("");
      setIsPublic(true);
      setCapacity(10);
    }
    setCreatingRoom(false);
  };

  const handleJoinByCode = async (e) => {
    if (e) e.preventDefault();
    if (!joinCode.trim() || joinCode.length !== 6) return;

    setJoiningRoom(true);
    await joinRoom(joinCode.toUpperCase());
    setJoiningRoom(false);
  };

  const handleJoinFromList = async (room) => {
    setJoiningRoom(true);
    await joinRoom(room.room_code);
    setJoiningRoom(false);
  };

  return (
    <div className="landing-page active">
      <div className="landing-header">
        <div>
          <div className="landing-title">☕ Virtual Café</div>
          <div className="landing-user-info">
            Welcome, {currentUser?.username || "Guest"}
          </div>
        </div>
        <div className="landing-header-buttons">
          {currentUser?.role === 'admin' && (
            <button className="btn-admin" onClick={handleShowAdmin}>
              🔑 Admin
            </button>
          )}
          <button className="btn-primary" onClick={handleShowProfile}>
            👤 Dashboard
          </button>
          <button className="btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="landing-content">
        {/* Join Room Card */}
        <div className="card">
          <h2>Join a Room</h2>

          <div className="join-code-section">
            <label htmlFor="joinRoomCode">Join with Code</label>
            <div className="add-task-form">
              <input
                type="text"
                id="joinRoomCode"
                placeholder="Enter 6-digit code"
                maxLength="6"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
              <button onClick={handleJoinByCode} disabled={joiningRoom}>
                {joiningRoom ? "..." : "Join"}
              </button>
            </div>
          </div>

          <div className="room-list">
            {loading ? (
              <div className="empty-state">Loading public rooms...</div>
            ) : rooms.length === 0 ? (
              <div className="empty-state">
                No public rooms available. Create one to get started!
              </div>
            ) : (
              rooms.map((room) => {
                let statusClass, statusText;
                if (room.timer_mode === 'study') {
                  statusClass = 'status-studying';
                  statusText = room.timer_running ? '📚 Studying' : '📚 Study Mode';
                } else if (room.timer_mode === 'break') {
                  statusClass = 'status-break';
                  statusText = room.timer_running ? '☕ On Break' : '☕ Break Mode';
                } else {
                  statusClass = 'status-idle';
                  statusText = '⏸ Waiting to Start';
                }

                return (
                  <div 
                    key={room.id} 
                    className="room-item" 
                    onClick={() => handleJoinFromList(room)}
                  >
                    <div className="room-item-info">
                      <div className="room-info-main">
                        <span className="room-item-name">{room.room_name}</span>
                        <span className="room-item-host">👑 Host: {room.host_username || 'Unknown'}</span>
                      </div>
                      <span className="room-item-count">👥 {room.participant_count || 0}/{room.capacity}</span>
                    </div>
                    <div className={`room-status ${statusClass}`}>
                      {statusText} • {room.is_public ? '🔓 Public' : '🔒 Private'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <button
            className="btn-secondary btn-full-width"
            onClick={loadPublicRooms}
            disabled={loading}
          >
            Refresh List
          </button>
        </div>

        {/* Create Room Card */}
        <div className="card">
          <h2>Create New Room</h2>
          <form onSubmit={handleCreateRoom}>
            <div className="form-group">
              <label htmlFor="roomName">Room Name</label>
              <input
                type="text"
                id="roomName"
                placeholder="E.g. Focus Session #1"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="capacity">Capacity (Max 50)</label>
              <input
                type="number"
                id="capacity"
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value))}
                min="1"
                max="50"
                required
              />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span>Public Room</span>
              </label>
            </div>
            <button 
              type="submit" 
              className="btn-full-width" 
              disabled={creatingRoom}
            >
              {creatingRoom ? "Creating..." : "Create Room"}
            </button>
          </form>
          {error && <div className="error-message show" style={{marginTop: '15px'}}>{error}</div>}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>My Profile</h2>
              <button className="close-button" onClick={() => setShowProfile(false)}>&times;</button>
            </div>
            <div className="profile-details">
              {profileData ? (
                <>
                  <div className="profile-picture-section">
                    <div className="profile-avatar-large">
                      {profileData.username?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="profile-info-grid">
                    <div className="info-item">
                      <label>Username</label>
                      <span>{profileData.username}</span>
                    </div>
                    <div className="info-item">
                      <label>Email</label>
                      <span>{profileData.email}</span>
                    </div>
                    <div className="info-item">
                      <label>Display Name</label>
                      <span>{profileData.display_name || "Not set"}</span>
                    </div>
                    <div className="info-item">
                      <label>Joined On</label>
                      <span>{new Date(profileData.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="info-item">
                      <label>Role</label>
                      <span className={`role-badge ${profileData.role}`}>{profileData.role}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="loading-spinner">Loading profile...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <div className="modal-overlay" onClick={() => setShowAdminPanel(false)}>
          <div className="modal-content admin-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Manage Users</h2>
              <button className="close-button" onClick={() => setShowAdminPanel(false)}>&times;</button>
            </div>
            <div className="admin-content">
              {adminLoading ? (
                <div className="loading-spinner">Loading users...</div>
              ) : (
                <div className="user-management-list">
                  <table className="user-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map(user => (
                        <tr key={user.id}>
                          <td>
                            <div className="user-cell">
                              <span className="user-avatar">{user.username.charAt(0).toUpperCase()}</span>
                              <span className="user-name">{user.username}</span>
                            </div>
                          </td>
                          <td>{user.email}</td>
                          <td><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                          <td>{new Date(user.created_at).toLocaleDateString()}</td>
                          <td>
                            <button 
                              className="btn-danger btn-sm" 
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={user.id === currentUser.id}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {allUsers.length === 0 && <div className="empty-state">No users found.</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .landing-page {
          padding: 40px 20px;
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f1ee 0%, #fff8f5 100%);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .landing-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #d7ccc8;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }

        .landing-title {
          font-size: 2.2em;
          color: #5c4033;
          font-weight: bold;
        }

        .landing-user-info {
          color: #8d6e63;
          font-weight: 500;
          font-size: 1.1em;
          margin-top: 5px;
        }

        .landing-header-buttons {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .landing-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          max-width: 1200px;
          margin: 40px auto 0;
        }

        .card {
          background: white;
          border-radius: 15px;
          padding: 30px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .card h2 {
          color: #5c4033;
          margin-bottom: 25px;
          font-size: 1.6em;
          border-bottom: 2px solid #f5f1ee;
          padding-bottom: 10px;
        }

        .join-code-section {
          margin-bottom: 25px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }

        .add-task-form {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }

        .add-task-form input {
          flex: 1;
          padding: 12px;
          border: 2px solid #d7ccc8;
          border-radius: 8px;
          font-size: 1em;
        }

        .add-task-form button {
          padding: 12px 20px;
          background: #6d4c41;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .room-list {
          max-height: 400px;
          overflow-y: auto;
          margin-bottom: 20px;
          padding-right: 5px;
        }

        .room-item {
          background: #f9f5f0;
          padding: 15px;
          margin-bottom: 12px;
          border-radius: 10px;
          border-left: 5px solid #d7ccc8;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .room-item:hover {
          background: #f5f0eb;
          border-left-color: #a1887f;
          transform: translateX(5px);
        }

        .room-item-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .room-info-main {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .room-item-name {
          font-weight: bold;
          color: #5c4033;
          font-size: 1.1em;
        }

        .room-item-host {
          font-size: 0.85em;
          color: #8d6e63;
        }

        .room-item-count {
          background: #d7ccc8;
          color: #3d3d3d;
          padding: 5px 10px;
          border-radius: 15px;
          font-size: 0.85em;
          font-weight: 600;
        }

        .room-status {
          font-size: 0.85em;
          margin-top: 8px;
          font-weight: 500;
        }

        .status-studying { color: #d84315; }
        .status-break { color: #4caf50; }
        .status-idle { color: #8d6e63; }

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
          border: 2px solid #d7ccc8;
          border-radius: 8px;
          font-size: 1em;
          box-sizing: border-box;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          color: #5c4033;
          font-weight: 600;
        }

        .checkbox-label input {
          width: auto;
        }

        button {
          background: #6d4c41;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 1em;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 600;
        }

        button:hover:not(:disabled) {
          background: #5d4037;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        button:disabled {
          background: #b0a0a0;
          cursor: not-allowed;
        }

        .btn-primary { background: #6d4c41; }
        .btn-secondary { background: #8d6e63; }
        .btn-admin { background: #5d4037; border: 1px solid #d7ccc8; }
        .btn-danger { background: #c62828; color: white; }
        .btn-sm { padding: 6px 12px; font-size: 0.85em; }
        .btn-full-width { width: 100%; }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 20px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          animation: modalFadeIn 0.3s ease-out;
        }

        .admin-modal {
          max-width: 900px;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          border-bottom: 2px solid #f5f1ee;
          padding-bottom: 15px;
        }

        .modal-header h2 {
          margin: 0;
          color: #5c4033;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 2em;
          color: #8d6e63;
          cursor: pointer;
          line-height: 1;
        }

        /* Profile Styles */
        .profile-picture-section {
          display: flex;
          justify-content: center;
          margin-bottom: 30px;
        }

        .profile-avatar-large {
          width: 100px;
          height: 100px;
          background: #d7ccc8;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 3em;
          color: #5c4033;
          font-weight: bold;
          border: 4px solid #fff;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .profile-info-grid {
          display: grid;
          gap: 20px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .info-item label {
          font-size: 0.85em;
          color: #8d6e63;
          font-weight: 600;
          text-transform: uppercase;
        }

        .info-item span {
          font-size: 1.1em;
          color: #3d2b1f;
          font-weight: 500;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.85em;
          font-weight: 600;
          text-transform: capitalize;
        }

        .role-badge.admin { background: #ffe0b2; color: #e65100; }
        .role-badge.user { background: #e1f5fe; color: #0277bd; }

        /* Admin Table Styles */
        .user-management-list {
          overflow-x: auto;
        }

        .user-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        .user-table th {
          text-align: left;
          padding: 12px;
          border-bottom: 2px solid #f5f1ee;
          color: #5c4033;
          font-weight: 600;
        }

        .user-table td {
          padding: 12px;
          border-bottom: 1px solid #f5f1ee;
        }

        .user-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          background: #d7ccc8;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: bold;
          font-size: 0.9em;
        }

        .error-message {
          background: #ffebee;
          color: #c62828;
          padding: 12px;
          border-radius: 8px;
          border-left: 4px solid #c62828;
          font-size: 0.9em;
        }

        .empty-state {
          text-align: center;
          color: #8d6e63;
          padding: 20px;
          font-style: italic;
        }

        /* Responsive Design */
        @media (max-width: 900px) {
          .landing-content {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .landing-header {
            flex-direction: column;
            text-align: center;
            gap: 20px;
          }
          .landing-header-buttons {
            width: 100%;
            justify-content: center;
            flex-wrap: wrap;
          }
          .landing-title {
            font-size: 1.8em;
          }
        }

        @media (max-width: 600px) {
          .landing-page {
            padding: 20px 10px;
          }
          .card {
            padding: 20px;
          }
          .landing-header-buttons button {
            flex: 1;
            min-width: 120px;
            font-size: 0.9em;
          }
          .user-table th:nth-child(2),
          .user-table td:nth-child(2),
          .user-table th:nth-child(4),
          .user-table td:nth-child(4) {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
