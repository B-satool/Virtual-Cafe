import React, { useState, useEffect, useCallback } from "react";
import { profileAPI } from "../utils/api";

export const DashboardPage = ({ currentUser, onBack, logout }) => {
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    displayName: "",
    username: "",
    email: "",
    profilePicture: null
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch profile
      const profileData = await profileAPI.getProfile();
      if (profileData.success) {
        setProfile(profileData.result);
        setEditForm({
          displayName: profileData.result.display_name || "",
          username: profileData.result.username || "",
          email: profileData.result.email || "",
          profilePicture: null
        });
      }

      // Fetch sessions (Note: sessions endpoint might not be in profileAPI yet, 
      // let's check api.js or use raw fetch for now if missing)
      const token = localStorage.getItem("userToken");
      const sessionRes = await fetch("/api/session-logs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sessionData = await sessionRes.json();
      if (sessionData.success) {
        setSessions(sessionData.result || []);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateStats = () => {
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, session) => {
      if (session.left_at) {
        const start = new Date(session.joined_at);
        const end = new Date(session.left_at);
        return sum + Math.floor((end - start) / (1000 * 60));
      }
      return sum;
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return {
      totalSessions,
      totalTime: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
    };
  };

  const handleEditProfile = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editForm.displayName.trim() || !editForm.username.trim()) {
      alert("Please fill in all fields");
      return;
    }

    setSavingProfile(true);
    try {
      const token = localStorage.getItem("userToken");
      const updates = {
        display_name: editForm.displayName,
        username: editForm.username.toLowerCase()
      };

      // Handle image upload if selected
      if (editForm.profilePicture) {
        const formData = new FormData();
        formData.append("file", editForm.profilePicture);
        
        const uploadRes = await fetch("/api/upload-profile-picture", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          updates.profile_picture_url = uploadData.url;
        } else {
          throw new Error(uploadData.error || "Failed to upload image");
        }
      }

      const data = await profileAPI.updateProfile(updates);
      if (data.success) {
        setIsEditModalOpen(false);
        loadData();
      } else {
        alert("Error updating profile: " + data.error);
      }
    } catch (err) {
      alert("Error saving profile: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const filteredSessions = sessions.filter(session => {
    const roomName = session.rooms?.room_name?.toLowerCase() || "";
    const roomCode = session.rooms?.room_code?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return roomName.includes(query) || roomCode.includes(query);
  });

  const stats = calculateStats();

  if (loading && !profile) {
    return <div className="dashboard-page active"><div className="loading-spinner"></div></div>;
  }

  return (
    <div className="dashboard-page active">
      <div className="dashboard-header">
        <h1>👤 Your Dashboard</h1>
        <div className="dashboard-header-buttons">
          <button className="btn-primary" onClick={onBack}>
            🏠 Browse Rooms
          </button>
          <button className="btn-secondary" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="dashboard-container">
        {/* User Profile Section */}
        <div className="dashboard-profile">
          <div className="profile-card">
            <div className="profile-avatar-section">
              {profile?.profile_picture_url ? (
                <img 
                  src={profile.profile_picture_url} 
                  alt="Profile" 
                  className="profile-picture" 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    // Show fallback
                    const fallback = e.target.parentElement.querySelector('.profile-avatar');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="profile-avatar" 
                style={{ display: profile?.profile_picture_url ? 'none' : 'flex' }}
              >
                {(profile?.display_name || profile?.username || "U")[0].toUpperCase()}
              </div>
            </div>
            <div className="profile-info">
              <h2 className="profile-name">{profile?.display_name || "User"}</h2>
              <p className="profile-username">@{profile?.username}</p>
              <p className="profile-email">{profile?.email}</p>
            </div>

            <div className="profile-stats">
              <div className="stat-item">
                <p className="stat-number">{stats.totalSessions}</p>
                <p className="stat-label">Total Sessions</p>
              </div>
              <div className="stat-item">
                <p className="stat-number">{stats.totalTime}</p>
                <p className="stat-label">Total Time</p>
              </div>
            </div>

            <div className="profile-actions">
              <button className="btn-edit-profile" onClick={handleEditProfile}>
                ✏️ Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Session Logs Section */}
        <div className="dashboard-sessions">
          <div className="session-filters">
            <h3>📋 Recent Session Logs</h3>
            <input
              type="text"
              className="filter-input"
              placeholder="Search by room name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="session-list">
            {filteredSessions.length === 0 ? (
              <div className="empty-sessions">
                <p>{searchQuery ? "No matching sessions found." : "No sessions yet. Join a room and start studying!"}</p>
              </div>
            ) : (
              filteredSessions.map((session, index) => {
                const joinedAt = new Date(session.joined_at);
                const leftAt = session.left_at ? new Date(session.left_at) : null;
                
                const duration = leftAt 
                  ? (() => {
                      const elapsed = leftAt - joinedAt;
                      const h = Math.floor(elapsed / 3600000);
                      const m = Math.floor((elapsed % 3600000) / 60000);
                      return h > 0 ? `${h}h ${m}m` : `${m}m`;
                    })()
                  : "In progress";

                return (
                  <div key={session.id || index} className="session-item">
                    <div className="session-header">
                      <div className="session-room">
                        <div className="session-room-name">{session.rooms?.room_name || "Unknown Room"}</div>
                        <div className="session-room-code">#{session.rooms?.room_code}</div>
                      </div>
                      <div className="session-duration">{duration}</div>
                    </div>
                    <div className="session-details">
                      <div className="session-detail">
                        <div className="session-detail-label">📅 Date</div>
                        <div className="session-detail-value">{joinedAt.toLocaleDateString()}</div>
                      </div>
                      <div className="session-detail">
                        <div className="session-detail-label">⏰ Join Time</div>
                        <div className="session-detail-value">
                          {joinedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="session-detail">
                        <div className="session-detail-label">🚪 Leave Time</div>
                        <div className="session-detail-value">
                          {leftAt ? leftAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Active"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="edit-profile-content">
            <h2>Edit Your Profile</h2>
            <form onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label>Display Name:</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  placeholder="Your display name"
                />
              </div>

              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  placeholder="your.username"
                />
                <small className="form-hint">Letters, numbers, and dots only (lowercase)</small>
              </div>

              <div className="form-group">
                <label>Email Address:</label>
                <input
                  type="email"
                  value={editForm.email}
                  disabled
                  className="disabled-input"
                />
                <small className="form-hint">Email address cannot be changed</small>
              </div>

              <div className="form-group">
                <label>Profile Picture:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditForm({ ...editForm, profilePicture: e.target.files[0] })}
                />
                <small className="form-hint">JPG, PNG up to 5MB</small>
              </div>

              <div className="edit-profile-buttons">
                <button type="submit" className="btn-save-profile" disabled={savingProfile}>
                  {savingProfile ? "Saving..." : "💾 Save Changes"}
                </button>
                <button type="button" className="btn-cancel-profile" onClick={() => setIsEditModalOpen(false)}>
                  ✕ Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .dashboard-page {
          padding: 40px 20px;
          background: radial-gradient(circle at top left, #fdfbfb 0%, #ebedee 100%);
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .dashboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1200px;
          margin: 0 auto 40px;
          animation: fadeInDown 0.6s ease-out;
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dashboard-header h1 {
          font-size: 2.5rem;
          margin: 0;
          color: #2d3436;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .dashboard-header-buttons {
          display: flex;
          gap: 15px;
        }

        .dashboard-header-buttons .btn-primary {
          background: #2d3436;
          color: white;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .dashboard-header-buttons .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.15);
          background: #000;
        }

        .dashboard-header-buttons .btn-secondary {
          background: transparent;
          color: #2d3436;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 600;
          border: 2px solid #2d3436;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .dashboard-header-buttons .btn-secondary:hover {
          background: rgba(45, 52, 54, 0.05);
        }

        .dashboard-container {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 40px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .profile-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.3);
          position: sticky;
          top: 40px;
          animation: fadeInLeft 0.6s ease-out;
        }

        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .profile-avatar-section {
          width: 140px;
          height: 140px;
          margin: 0 auto 30px;
          position: relative;
        }

        .profile-avatar-section::after {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6c5ce7, #a29bfe);
          z-index: -1;
          opacity: 0.3;
        }

        .profile-picture {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid #fff;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        .profile-avatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3.5rem;
          color: white;
          font-weight: 700;
          box-shadow: 0 10px 25px rgba(108, 92, 231, 0.2);
        }

        .profile-name {
          font-size: 1.75rem;
          color: #2d3436;
          margin: 0 0 8px 0;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .profile-username {
          color: #636e72;
          font-weight: 500;
          font-size: 1.1rem;
          margin: 0 0 12px 0;
        }

        .profile-email {
          color: #b2bec3;
          font-size: 0.95rem;
          margin-bottom: 30px;
        }

        .profile-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 40px 0;
          padding: 24px;
          background: rgba(248, 249, 250, 0.5);
          border-radius: 20px;
          border: 1px solid rgba(0,0,0,0.03);
        }

        .stat-number {
          font-size: 1.75rem;
          font-weight: 800;
          color: #2d3436;
          margin: 0;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #636e72;
          text-transform: uppercase;
          margin: 8px 0 0 0;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .btn-edit-profile {
          width: 100%;
          background: #f1f2f6;
          color: #2d3436;
          border: none;
          padding: 14px;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-edit-profile:hover {
          background: #dfe6e9;
          transform: translateY(-2px);
        }

        .dashboard-sessions {
          animation: fadeInRight 0.6s ease-out;
        }

        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .session-filters {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          padding: 30px;
          border-radius: 24px;
          margin-bottom: 25px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .session-filters h3 {
          margin: 0 0 20px 0;
          font-size: 1.25rem;
          color: #2d3436;
          font-weight: 800;
          letter-spacing: -0.3px;
        }

        .filter-input {
          width: 100%;
          padding: 16px 20px;
          border: 2px solid #f1f2f6;
          border-radius: 14px;
          box-sizing: border-box;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: #fafafa;
        }

        .filter-input:focus {
          outline: none;
          border-color: #6c5ce7;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(108, 92, 231, 0.1);
        }

        .session-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .session-item {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          border-radius: 24px;
          padding: 25px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
          border: 1px solid rgba(255, 255, 255, 0.3);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .session-item:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 15px 40px rgba(0,0,0,0.08);
          border-color: rgba(108, 92, 231, 0.2);
        }

        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .session-room-name {
          font-weight: 800;
          color: #2d3436;
          font-size: 1.2rem;
          letter-spacing: -0.3px;
        }

        .session-room-code {
          color: #b2bec3;
          font-size: 0.85rem;
          font-family: 'Fira Code', monospace;
          margin-top: 4px;
          display: block;
        }

        .session-duration {
          background: #6c5ce7;
          color: white;
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
        }

        .session-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 20px;
          border-top: 1px solid #f1f2f6;
        }

        .session-detail-label {
          font-size: 0.7rem;
          color: #b2bec3;
          text-transform: uppercase;
          font-weight: 800;
          margin-bottom: 6px;
          letter-spacing: 1px;
        }

        .session-detail-value {
          font-size: 0.95rem;
          color: #2d3436;
          font-weight: 700;
        }

        .empty-sessions {
          background: rgba(255, 255, 255, 0.5);
          padding: 60px;
          border-radius: 24px;
          text-align: center;
          color: #b2bec3;
          border: 2px dashed #dfe6e9;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(45, 52, 54, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .edit-profile-content {
          background: #fff;
          padding: 40px;
          border-radius: 30px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 30px 70px rgba(0,0,0,0.2);
          animation: modalSlideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .edit-profile-content h2 {
          margin: 0 0 30px 0;
          color: #2d3436;
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .form-group label {
          font-size: 0.9rem;
          font-weight: 700;
          color: #2d3436;
          margin-bottom: 10px;
          display: block;
        }

        .form-group input {
          width: 100%;
          padding: 14px 18px;
          border: 2px solid #f1f2f6;
          border-radius: 12px;
          font-size: 1rem;
          background: #fafafa;
          transition: all 0.3s ease;
        }

        .form-group input:focus {
          border-color: #6c5ce7;
          background: #fff;
        }

        .disabled-input {
          background: #f8f9fa !important;
          color: #adb5bd !important;
          cursor: not-allowed;
          border-color: #e9ecef !important;
        }

        .edit-profile-buttons {
          display: flex;
          gap: 15px;
          margin-top: 40px;
        }

        .btn-save-profile {
          flex: 2;
          background: #6c5ce7;
          color: white;
          border: none;
          padding: 16px;
          border-radius: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
        }

        .btn-save-profile:hover {
          background: #5b4bc4;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(108, 92, 231, 0.4);
        }

        .btn-cancel-profile {
          flex: 1;
          background: #f1f2f6;
          color: #2d3436;
          border: none;
          padding: 16px;
          border-radius: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-cancel-profile:hover {
          background: #dfe6e9;
        }

        @media (max-width: 1024px) {
          .dashboard-container {
            grid-template-columns: 1fr;
          }
          .profile-card {
            position: relative;
            top: 0;
          }
        }

        @media (max-width: 600px) {
          .session-details {
            grid-template-columns: 1fr;
          }
          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
