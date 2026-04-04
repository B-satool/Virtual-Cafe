// Sanitize user input to prevent XSS
export const sanitizeInput = (input) => {
  const element = document.createElement("div");
  element.textContent = input;
  return element.innerHTML;
};

// Escape HTML special characters
export const escapeHtml = (text) => {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// Format time in seconds to MM:SS format
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// Generate a random room code
export const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Validate email format
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!localStorage.getItem("userToken");
};

// Get current user from localStorage
export const getCurrentUser = () => {
  const id = localStorage.getItem("userId");
  const username = localStorage.getItem("username");
  return id ? { id, username } : null;
};

// Clear user session
export const clearSession = () => {
  localStorage.removeItem("userToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");
  localStorage.removeItem("currentRoom");
  localStorage.removeItem("currentUsername");
};

// Sleep function for delays
export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Debounce function
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Get initials from username for avatar
export const getInitials = (username) => {
  if (!username) return "?";
  return username
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

// Convert seconds to readable duration
export const secondsToReadable = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
};

// Check if room is full
export const isRoomFull = (room) => {
  return room.participant_count >= room.capacity;
};

// Sort participants by host status
export const sortParticipants = (participants) => {
  return [...participants].sort((a, b) => {
    if (a.is_host === b.is_host) return 0;
    return a.is_host ? -1 : 1;
  });
};
