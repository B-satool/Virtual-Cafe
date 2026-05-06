/**
 * Timer Settings and Sound Management for Virtual Café
 */

import { getSocket, getSocketState } from "./socket.js";
import { updateTimerUI } from "./timer.js";

// Default settings
const DEFAULT_SETTINGS = {
  studyDuration: 25 * 60, // 25 minutes in seconds
  breakDuration: 5 * 60, // 5 minutes in seconds
  enableSound: true,
};

/**
 * Initialize timer settings from localStorage
 */
export function initializeTimerSettings() {
  const saved = localStorage.getItem("timerSettings");
  if (!saved) {
    localStorage.setItem("timerSettings", JSON.stringify(DEFAULT_SETTINGS));
  }
  return getTimerSettings();
}

/**
 * Get current timer settings
 */
export function getTimerSettings() {
  try {
    const saved = localStorage.getItem("timerSettings");
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Show timer settings modal
 */
export function showTimerSettings() {
  const { isHost } = getSocketState();

  // Only host can modify timer settings
  if (!isHost) {
    alert("Only the room host can modify timer settings.");
    return;
  }

  const settings = getTimerSettings();

  // Populate modal with current settings
  const studyInput = document.getElementById("studyDuration");
  const breakInput = document.getElementById("breakDuration");
  const soundCheckbox = document.getElementById("enableTimerSound");

  if (studyInput) studyInput.value = settings.studyDuration / 60;
  if (breakInput) breakInput.value = settings.breakDuration / 60;
  if (soundCheckbox) soundCheckbox.checked = settings.enableSound;

  // Show modal
  const modal = document.getElementById("timerSettingsModal");
  if (modal) modal.style.display = "flex";
}

/**
 * Close timer settings modal
 */
export function closeTimerSettings() {
  const modal = document.getElementById("timerSettingsModal");
  if (modal) modal.style.display = "none";
}

/**
 * Save timer settings and notify backend
 */
export function saveTimerSettings() {
  const { socket, currentRoom, isHost } = getSocketState();

  if (!isHost) {
    alert("Only the room host can modify timer settings.");
    return;
  }

  const studyInput = document.getElementById("studyDuration");
  const breakInput = document.getElementById("breakDuration");
  const soundCheckbox = document.getElementById("enableTimerSound");

  const studyMinutes = parseInt(studyInput?.value) || 25;
  const breakMinutes = parseInt(breakInput?.value) || 5;
  const enableSound = soundCheckbox?.checked ?? true;

  // Validate input
  if (studyMinutes < 1 || studyMinutes > 120) {
    alert("Study duration must be between 1 and 120 minutes");
    return;
  }

  if (breakMinutes < 1 || breakMinutes > 60) {
    alert("Break duration must be between 1 and 60 minutes");
    return;
  }

  // Save to localStorage
  const settings = {
    studyDuration: studyMinutes * 60,
    breakDuration: breakMinutes * 60,
    enableSound,
  };

  localStorage.setItem("timerSettings", JSON.stringify(settings));

  // Notify backend to apply new settings
  if (socket && currentRoom) {
    socket.emit("timer:configure", {
      roomCode: currentRoom,
      studyDuration: studyMinutes * 60,
      breakDuration: breakMinutes * 60,
    });

    // Reset the timer with new settings
    setTimeout(() => {
      socket.emit("timer:reset");
    }, 100);
  }

  // Immediately update the timer display with new settings
  updateTimerUI({
    timeRemaining: studyMinutes * 60, // Show new study duration
    mode: "study",
    isRunning: false,
    totalTime: studyMinutes * 60,
  });

  closeTimerSettings();
  alert("Timer settings updated!");
}

/**
 * Play notification sound when timer ends
 */
export function playTimerEndSound(mode) {
  const settings = getTimerSettings();

  if (!settings.enableSound) return;

  // Create audio context and play beep sound
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  if (mode === "study") {
    // Study end: 3 ascending beeps
    playBeeps(audioContext, [800, 1000, 1200], 200, 100);
  } else {
    // Break end: 2 descending beeps
    playBeeps(audioContext, [1200, 800], 200, 150);
  }

  // Visual notification
  notifyTimerEnd(mode);
}

/**
 * Play beep sounds using Web Audio API
 */
function playBeeps(audioContext, frequencies, duration, delayBetween) {
  frequencies.forEach((freq, index) => {
    const startTime =
      audioContext.currentTime + (index * (duration + delayBetween)) / 1000;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = freq;
    oscillator.type = "sine";

    // Envelope: quick attack, decay
    gainNode.gain.setValueAtTime(0.3, startTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      startTime + duration / 1000,
    );

    oscillator.start(startTime);
    oscillator.stop(startTime + duration / 1000);
  });
}

/**
 * Show visual timer end notification
 */
function notifyTimerEnd(mode) {
  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  ) {
    new Notification("Virtual Café", {
      title:
        mode === "study"
          ? "✅ Study Session Completed!"
          : "☕ Break Time Over!",
      body: mode === "study" ? "Time for a break! 📍" : "Ready to focus? 📚",
      icon: "/favicon.ico",
    });
  }
}

/**
 * Request notification permission
 */
export function requestNotificationPermission() {
  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "default"
  ) {
    Notification.requestPermission();
  }
}
