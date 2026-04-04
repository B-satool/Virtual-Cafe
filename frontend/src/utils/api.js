// Base API URL
const API_BASE_URL = "/api";

// Helper function to make API requests
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem("userToken");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "API request failed");
    }

    return data;
  } catch (error) {
    throw new Error(error.message || "Network error");
  }
};

// Auth endpoints
export const authAPI = {
  login: (email, password) =>
    apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  signup: (email, password, username) =>
    apiCall("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, username }),
    }),

  logout: () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
  },

  verifyToken: () => apiCall("/auth/verify", { method: "GET" }),
};

// Room endpoints
export const roomAPI = {
  createRoom: (name, isPrivate, capacity, createdBy) =>
    apiCall("/rooms/create", {
      method: "POST",
      body: JSON.stringify({
        name,
        is_private: isPrivate,
        capacity,
        created_by: createdBy,
      }),
    }),

  joinRoom: (roomCode, userId) =>
    apiCall("/rooms/join", {
      method: "POST",
      body: JSON.stringify({
        room_code: roomCode,
        user_id: userId,
      }),
    }),

  getPublicRooms: () => apiCall("/rooms/public", { method: "GET" }),

  getRoomByCode: (roomCode) => apiCall(`/rooms/${roomCode}`, { method: "GET" }),

  deleteRoom: (roomId) => apiCall(`/rooms/${roomId}`, { method: "DELETE" }),
};

// Participant endpoints
export const participantAPI = {
  getParticipants: (roomId) =>
    apiCall(`/rooms/${roomId}/participants`, { method: "GET" }),

  addParticipant: (roomId, userId) =>
    apiCall(`/rooms/${roomId}/participants`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),

  removeParticipant: (roomId, userId) =>
    apiCall(`/rooms/${roomId}/participants/${userId}`, { method: "DELETE" }),

  setHostStatus: (roomId, userId, isHost) =>
    apiCall(`/rooms/${roomId}/participants/${userId}/host`, {
      method: "PUT",
      body: JSON.stringify({ is_host: isHost }),
    }),
};

// Task endpoints
export const taskAPI = {
  getTasks: (roomId) => apiCall(`/tasks/room/${roomId}`, { method: "GET" }),

  addTask: (roomId, description, userId) =>
    apiCall("/tasks", {
      method: "POST",
      body: JSON.stringify({
        room_id: roomId,
        description,
        user_id: userId,
      }),
    }),

  updateTask: (taskId, updates) =>
    apiCall(`/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  deleteTask: (taskId) => apiCall(`/tasks/${taskId}`, { method: "DELETE" }),
};

// User profile endpoints
export const profileAPI = {
  getProfile: (userId) => apiCall(`/profiles/${userId}`, { method: "GET" }),

  updateProfile: (userId, updates) =>
    apiCall(`/profiles/${userId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  getUserSettings: (userId) =>
    apiCall(`/users/${userId}/settings`, { method: "GET" }),

  updateUserSettings: (userId, settings) =>
    apiCall(`/users/${userId}/settings`, {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
};

// Timer endpoints
export const timerAPI = {
  saveTimerState: (roomId, state) =>
    apiCall(`/timer/${roomId}/state`, {
      method: "POST",
      body: JSON.stringify(state),
    }),

  getTimerState: (roomId) =>
    apiCall(`/timer/${roomId}/state`, { method: "GET" }),
};

// Join request endpoints
export const joinRequestAPI = {
  createJoinRequest: (roomId, userId) =>
    apiCall("/join-requests", {
      method: "POST",
      body: JSON.stringify({ room_id: roomId, user_id: userId }),
    }),

  getJoinRequests: (roomId) =>
    apiCall(`/rooms/${roomId}/join-requests`, { method: "GET" }),

  approveJoinRequest: (requestId) =>
    apiCall(`/join-requests/${requestId}/approve`, { method: "POST" }),

  rejectJoinRequest: (requestId) =>
    apiCall(`/join-requests/${requestId}/reject`, { method: "POST" }),
};

export default {
  authAPI,
  roomAPI,
  participantAPI,
  taskAPI,
  profileAPI,
  timerAPI,
  joinRequestAPI,
};
