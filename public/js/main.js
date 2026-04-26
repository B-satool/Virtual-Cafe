/**
 * Main Application Entry Point for Virtual Café
 */

import {
  initSocket,
  getSocket,
  setSocketState,
  getSocketState,
  disconnectSocket,
} from "./modules/socket.js";
import {
  showHomePage,
  showLandingPage,
  showLoginPage,
  showSignupPage,
  toggleAmbientSounds,
  showRoomPage,
  showDashboardPage,
} from "./modules/ui.js";
import {
  handleLoginSubmit,
  handleSignupSubmit,
  verifyToken,
  logout,
} from "./modules/auth.js";
import { loadPublicRooms } from "./modules/api.js";
import {
  handleCreateRoom,
  joinRoomWithUsername,
  leaveRoom,
  joinByCode,
  cancelJoinRequest,
  updateRoomUI,
  updateParticipants,
  updateHostInfo,
  transferHost,
  removeParticipant,
  showTransferHostModal,
} from "./modules/room.js";
import {
  updateTimerUI,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
} from "./modules/timer.js";
import {
  initializeTimerSettings,
  showTimerSettings,
  closeTimerSettings,
  saveTimerSettings,
  getTimerSettings,
  playTimerEndSound,
  requestNotificationPermission,
} from "./modules/timerSettings.js";
import {
  addTask,
  updateTaskCompletion,
  deleteTask,
  updateTasksUI,
} from "./modules/tasks.js";
import {
  sendChatMessage,
  displayChatMessage,
  loadChatHistory,
  clearChat,
} from "./modules/chat.js";
import {
  loadDashboard,
  filterSessions,
  editProfile,
  closeEditProfile,
  saveProfile,
} from "./modules/dashboard.js";
import { showNotification } from "./modules/utils.js";
import {
  toggleSound,
  updateSoundVolume,
  loadSoundPreferences,
  stopAllSounds,
} from "./modules/sound.js";

// Global access for HTML onclick handlers
window.showLoginPage = showLoginPage;
window.showSignupPage = showSignupPage;
window.showHomePage = showHomePage;
window.showLandingPage = showLandingPage;
window.handleLoginSubmit = handleLoginSubmit;
window.handleSignupSubmit = handleSignupSubmit;
window.toggleAmbientSounds = toggleAmbientSounds;
window.toggleSound = toggleSound;
window.updateSoundVolume = updateSoundVolume;
window.joinRoom = (roomCode) => {
  const username =
    localStorage.getItem("currentUsername") ||
    localStorage.getItem("userEmail")?.split("@")[0] || "Guest";
  joinRoomWithUsername(roomCode, username);
};
window.joinByCode = joinByCode;
window.cancelJoinRequest = cancelJoinRequest;
window.createRoom = handleCreateRoom;
window.leaveRoom = leaveRoom;
window.startTimer = startTimer;
window.pauseTimer = pauseTimer;
window.resumeTimer = resumeTimer;
window.resetTimer = resetTimer;
window.addTask = addTask;
window.updateTaskCompletion = updateTaskCompletion;
window.deleteTask = deleteTask;
window.logout = logout;
window.transferHost = transferHost;
window.removeParticipant = removeParticipant;
window.showTransferHostModal = showTransferHostModal;
window.sendChatMessage = sendChatMessage;
window.showTimerSettings = showTimerSettings;
window.closeTimerSettings = closeTimerSettings;
window.saveTimerSettings = saveTimerSettings;
window.showDashboardPage = showDashboardPage;
window.loadDashboard = loadDashboard;
window.filterSessions = filterSessions;
window.editProfile = editProfile;
window.closeEditProfile = closeEditProfile;
window.showGetStarted = () => {
  showSignupPage();
};
window.saveProfile = saveProfile;

/**
 * Switch between tabs (Tasks and Chat)
 */
window.switchTab = function (tab) {
  // Update tab buttons
  const tasksTab = document.getElementById("tasksTab");
  const chatTab = document.getElementById("chatTab");

  // Update content visibility
  const tasksContent = document.getElementById("tasksContent");
  const chatContent = document.getElementById("chatContent");

  if (tab === "tasks") {
    tasksTab.classList.add("tab-active");
    chatTab.classList.remove("tab-active");
    tasksContent.style.display = "block";
    chatContent.style.display = "none";
  } else if (tab === "chat") {
    tasksTab.classList.remove("tab-active");
    chatTab.classList.add("tab-active");
    tasksContent.style.display = "none";
    chatContent.style.display = "block";
    // Focus chat input when switching to chat
    setTimeout(() => {
      const chatInput = document.getElementById("chatInput");
      if (chatInput) chatInput.focus();
    }, 0);
  }
};

/**
 * Restore session from localStorage
 */
async function restoreSession() {
  const accessToken = localStorage.getItem("accessToken");
  const userId = localStorage.getItem("userId");
  const userEmail = localStorage.getItem("userEmail");

  if (!accessToken || !userId) {
    showHomePage();
    return;
  }

  try {
    const isValid = await verifyToken();
    if (isValid) {
      document.getElementById("currentUserDisplay").textContent =
        `Welcome, ${localStorage.getItem('currentUsername') || userEmail.split("@")[0]}`;

      const roomCode = localStorage.getItem("currentRoom");
      const username = localStorage.getItem("currentUsername");
      const currentPage = localStorage.getItem("currentPage");

      if (roomCode && username && currentPage === "roomPage") {
        await joinRoomWithUsername(
          roomCode,
          username,
          localStorage.getItem("isRoomHost") === "true",
        );
      } else {
        showLandingPage();
        loadPublicRooms();
      }
    } else {
      localStorage.clear();
      showHomePage();
    }
  } catch (error) {
    console.error("Session restoration error:", error);
    showHomePage();
  }
}

/**
 * Initialize the application
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize timer settings
  initializeTimerSettings();
  requestNotificationPermission();

  // Initial session check
  await restoreSession();

  // Auth success listener
  window.addEventListener("auth:success", () => {
    loadPublicRooms();
  });

  // Global event listeners for input fields
  setupEventListeners();

  // Socket Initialization & Event Handlers
  setupSocketEvents();
});

function setupEventListeners() {
  const taskInput = document.getElementById("taskInput");
  if (taskInput) {
    taskInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") addTask();
    });
  }

  const joinCodeInput = document.getElementById("joinRoomCode");
  if (joinCodeInput) {
    joinCodeInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") joinByCode();
    });
  }

  // Generic form enter listeners could be added here
}

function setupSocketEvents() {
  // We only set up these once
  const socket = initSocket();

  socket.on("room:state", (state) => {
    console.log("[SYNC] Received authoritative state:", state);

    const username =
      localStorage.getItem("currentUsername") ||
      localStorage.getItem("userEmail")?.split("@")[0] || "Guest";

    // Trust the server's isHost flag 100%
    setSocketState(
      state.room ? state.room.room_code : null,
      username,
      state.isHost,
      state,
    );

    updateRoomUI(state);
    updateParticipants(state.participants || []);
    updateTasksUI(state.tasks || []);
    updateTimerUI(state.timer || {});
    updateHostInfo();
  });

  socket.on("participant:joined", (data) => {
    const { roomState } = getSocketState();
    if (data.participants) {
      roomState.participants = data.participants;
      updateParticipants(data.participants);
    }
    if (data.username) {
      showNotification(`${data.username} joined the room`);
    }
  });

  socket.on("participant:left", (data) => {
    const { roomState } = getSocketState();
    if (roomState.participants) {
      roomState.participants = roomState.participants.filter(
        (p) => p.user_id !== data.userId,
      );
      updateParticipants(roomState.participants);
    }
    showNotification("A participant left the room");
  });

  socket.on("timer:started", (timerState) => updateTimerUI(timerState));
  socket.on("timer:paused", (timerState) => updateTimerUI(timerState));
  socket.on("timer:resumed", (timerState) => updateTimerUI(timerState));
  socket.on("timer:reset", (timerState) => updateTimerUI(timerState));
  socket.on("timer:tick", (timerState) => updateTimerUI(timerState));

  socket.on("timer:transitioned", (timerState) => {
    updateTimerUI(timerState);

    // Play sound notification when transitioning (previous session ended)
    const previousMode = timerState.mode === "study" ? "break" : "study";
    playTimerEndSound(previousMode);

    showNotification(
      `Mode changed to ${timerState.mode === "study" ? "Study" : "Break"}`,
    );
  });

  socket.on("timer:configured", (data) => {
    showNotification(
      `⚙️ Host updated timer settings: Study ${data.studyDuration / 60}min, Break ${data.breakDuration / 60}min`,
    );
  });

  socket.on("chat:message", (data) => {
    displayChatMessage(data);
  });

  socket.on("chat:history", (messages) => {
    loadChatHistory(messages);
  });

  socket.on("host:transferred", (data) => {
    showNotification(`${data.newHostName || "Another user"} is now the host`);
  });

  socket.on("participant:removed", (data) => {
    showNotification("You have been removed from the room", true);
    leaveRoom();
  });

  socket.on("participant:removed_from_room", (data) => {
    showNotification(`${data.username || "A participant"} has been removed`);
  });

  socket.on("task:added", (task) => {
    const { roomState } = getSocketState();
    if (roomState.tasks) {
      roomState.tasks.push(task);
      updateTasksUI(roomState.tasks);
    }
  });

  socket.on("task:updated", (updatedTask) => {
    const { roomState } = getSocketState();
    if (roomState && roomState.tasks) {
      const index = roomState.tasks.findIndex((t) => t.id === updatedTask.id);
      if (index !== -1) {
        roomState.tasks[index] = updatedTask;
        updateTasksUI(roomState.tasks);
      }
    }
  });

  socket.on("task:deleted", (data) => {
    const { roomState } = getSocketState();
    if (roomState && roomState.tasks) {
      roomState.tasks = roomState.tasks.filter((t) => t.id !== data.taskId);
      updateTasksUI(roomState.tasks);
    }
  });

  socket.on("room:closed", (data) => {
    showNotification(data.message, true);
    leaveRoom();
  });
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  disconnectSocket();
});
