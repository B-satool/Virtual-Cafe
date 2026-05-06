/**
 * Dashboard Module for Virtual Café
 */

/**
 * Load and display dashboard data
 */
export async function loadDashboard() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  try {
    // Fetch user profile
    const profileRes = await fetch("/api/user-profile", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    const profileData = await profileRes.json();

    if (profileData.success) {
      displayUserProfile(profileData.result);
    } else {
      console.error("Failed to load profile:", profileData.error);
    }

    // Fetch session logs
    const sessionRes = await fetch("/api/session-logs", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    const sessionData = await sessionRes.json();

    if (sessionData.success) {
      if (sessionData.result && sessionData.result.length > 0) {
        displaySessionLogs(sessionData.result);
        calculateSessionStats(sessionData.result);
      } else {
        // No session logs yet
        const sessionList = document.getElementById("sessionList");
        sessionList.innerHTML =
          '<div class="empty-sessions"><p>No sessions yet. Join a room and start studying to see your history here!</p></div>';
        // Initialize stats to 0
        document.getElementById("totalSessions").textContent = "0";
        document.getElementById("totalHours").textContent = "0h";
      }
    } else {
      console.error("Failed to load session logs:", sessionData.error);
      const sessionList = document.getElementById("sessionList");
      sessionList.innerHTML =
        '<div class="empty-sessions"><p>Unable to load session logs. Please try refreshing the page.</p></div>';
    }
  } catch (error) {
    console.error("Error loading dashboard:", error);
    const sessionList = document.getElementById("sessionList");
    if (sessionList) {
      sessionList.innerHTML =
        '<div class="empty-sessions"><p>Error loading data. Please check your connection.</p></div>';
    }
  }
}

/**
 * Display user profile information
 */
function displayUserProfile(profile) {
  const name = profile.display_name || "User";
  const email = profile.email || "";
  const username = profile.username || name.toLowerCase().replace(/\s+/g, ".");
  const profilePicture = profile.profile_picture_url;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  document.getElementById("profileName").textContent = name;
  document.getElementById("profileUsername").textContent = "@" + username;
  document.getElementById("profileEmail").textContent = email;

  // Handle profile picture
  const profilePictureImg = document.getElementById("profilePicture");
  const profileAvatarFallback = document.getElementById(
    "profileAvatarFallback",
  );

  if (profilePicture) {
    profilePictureImg.src = profilePicture;
    profilePictureImg.style.display = "block";
    profileAvatarFallback.style.display = "none";
  } else {
    profilePictureImg.style.display = "none";
    profileAvatarFallback.style.display = "flex";
    profileAvatarFallback.textContent = initials.substring(0, 1);
  }

  // Store profile for edit modal
  window.userProfile = profile;
}

/**
 * Display session logs
 */
function displaySessionLogs(sessions) {
  const sessionList = document.getElementById("sessionList");

  if (!sessions || sessions.length === 0) {
    sessionList.innerHTML =
      '<div class="empty-sessions"><p>No session logs yet. Join a room to start tracking your study time!</p></div>';
    return;
  }

  const html = sessions
    .map((session) => {
      const joinedAt = new Date(session.joined_at);
      const leftAt = session.left_at ? new Date(session.left_at) : null;

      const joinedDate = joinedAt.toLocaleDateString();
      const joinedTime = joinedAt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const leftTime = leftAt
        ? leftAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "Still active";

      const duration = leftAt
        ? calculateDuration(joinedAt, leftAt)
        : "In progress";
      const roomName = session.rooms?.room_name || "Unknown Room";
      const roomCode = session.rooms?.room_code || "";

      return `
            <div class="session-item">
                <div class="session-header">
                    <div class="session-room">
                        <div class="session-room-name">${escapeHtml(roomName)}</div>
                        <div class="session-room-code">#${escapeHtml(roomCode)}</div>
                    </div>
                    <div class="session-duration">${duration}</div>
                </div>
                <div class="session-details">
                    <div class="session-detail">
                        <div class="session-detail-label">📅 Date</div>
                        <div class="session-detail-value">${joinedDate}</div>
                    </div>
                    <div class="session-detail">
                        <div class="session-detail-label">⏰ Join Time</div>
                        <div class="session-detail-value">${joinedTime}</div>
                    </div>
                    <div class="session-detail">
                        <div class="session-detail-label">🚪 Leave Time</div>
                        <div class="session-detail-value">${leftTime}</div>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");

  sessionList.innerHTML = html;
}

/**
 * Calculate session stats (total sessions, total hours)
 */
function calculateSessionStats(sessions) {
  if (!sessions || sessions.length === 0) {
    document.getElementById("totalSessions").textContent = "0";
    document.getElementById("totalHours").textContent = "0h";
    return;
  }

  const totalSessions = sessions.length;

  const totalMinutes = sessions.reduce((sum, session) => {
    if (session.left_at) {
      const start = new Date(session.joined_at);
      const end = new Date(session.left_at);
      const minutes = Math.floor((end - start) / (1000 * 60));
      return sum + minutes;
    }
    return sum;
  }, 0);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  document.getElementById("totalSessions").textContent = totalSessions;
  document.getElementById("totalHours").textContent =
    hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * Calculate duration between two timestamps
 */
function calculateDuration(startDate, endDate) {
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;

  const elapsed = endDate - startDate;

  const hours = Math.floor(elapsed / msPerHour);
  const minutes = Math.floor((elapsed % msPerHour) / msPerMinute);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Filter sessions based on search input
 */
export function filterSessions() {
  const searchInput =
    document.getElementById("sessionSearch")?.value.toLowerCase() || "";
  const sessionItems = document.querySelectorAll(".session-item");

  sessionItems.forEach((item) => {
    const roomName =
      item.querySelector(".session-room-name")?.textContent.toLowerCase() || "";
    const roomCode =
      item.querySelector(".session-room-code")?.textContent.toLowerCase() || "";

    if (roomName.includes(searchInput) || roomCode.includes(searchInput)) {
      item.style.display = "block";
    } else {
      item.style.display = "none";
    }
  });
}

/**
 * Show edit profile modal
 */
export function editProfile() {
  if (!window.userProfile) return;

  document.getElementById("editDisplayName").value =
    window.userProfile.display_name || "";
  document.getElementById("editUsername").value =
    window.userProfile.username || "";
  document.getElementById("editEmail").value = window.userProfile.email || "";
  document.getElementById("profilePictureUpload").value = "";
  document.getElementById("editProfileModal").classList.add("active");
}

/**
 * Close edit profile modal
 */
export function closeEditProfile() {
  document.getElementById("editProfileModal").classList.remove("active");
}

/**
 * Save profile changes
 */
export async function saveProfile() {
  const displayName = document.getElementById("editDisplayName").value.trim();
  const username = document.getElementById("editUsername").value.trim();
  const fileInput = document.getElementById("profilePictureUpload");

  if (!displayName) {
    alert("Please enter a display name");
    return;
  }

  if (!username) {
    alert("Please enter a username");
    return;
  }

  // Validate username (only letters, numbers, dots)
  if (!/^[a-z0-9.]+$/.test(username.toLowerCase())) {
    alert(
      "Username can only contain letters, numbers, and dots (lowercase only)",
    );
    return;
  }

  try {
    const updates = {
      display_name: displayName,
      username: username.toLowerCase(),
    };

    // Handle profile picture upload
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("Profile picture must be less than 5MB");
        return;
      }

      try {
        // Upload to Supabase Storage
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `profile-pictures/${fileName}`;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("filePath", filePath);

        const uploadRes = await fetch("/api/upload-profile-picture", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadData.success) {
          alert("Error uploading image: " + uploadData.error);
          return;
        }

        updates.profile_picture_url = uploadData.url;
      } catch (error) {
        console.error("Error uploading profile picture:", error);
        alert("Error uploading profile picture: " + error.message);
        return;
      }
    }

    await submitProfileUpdate(updates);
  } catch (error) {
    console.error("Error in saveProfile:", error);
    alert("Error saving profile: " + error.message);
  }
}

/**
 * Submit profile update to backend
 */
async function submitProfileUpdate(updates) {
  try {
    const res = await fetch("/api/update-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
      body: JSON.stringify(updates),
    });

    const data = await res.json();

    if (data.success) {
      alert("Profile updated successfully!");
      closeEditProfile();
      loadDashboard();
    } else {
      alert("Error updating profile: " + (data.error || "Unknown error"));
    }
  } catch (error) {
    console.error("Error saving profile:", error);
    alert("Error saving profile");
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
