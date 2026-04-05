/**
 * Chat Management for Virtual Café
 */

import { getSocket, getSocketState, setSocketState } from "./socket.js";
import { escapeHtml } from "./utils.js";

/**
 * Send a chat message to the room
 */
export function sendChatMessage() {
  const { socket, currentRoom } = getSocketState();
  if (!socket || !currentRoom) return;

  const chatInput = document.getElementById("chatInput");
  if (!chatInput) return;

  const message = chatInput.value.trim();
  if (!message) return;

  const username =
    localStorage.getItem("currentUsername") ||
    localStorage.getItem("userEmail")?.split("@")[0] || "Guest";
  const userId = localStorage.getItem("userId");

  socket.emit("chat:message", {
    roomCode: currentRoom,
    userId,
    username,
    message,
    timestamp: new Date().toISOString(),
  });

  // Clear input
  chatInput.value = "";
  chatInput.focus();
}

/**
 * Display a message in the chat
 */
export function displayChatMessage(data) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;

  const currentUserId = localStorage.getItem("userId");
  const isOwnMessage =
    String(data.userId).toLowerCase() === String(currentUserId).toLowerCase();

  // Remove empty state if exists
  const emptyState = chatMessages.querySelector(".empty-state");
  if (emptyState && chatMessages.children.length === 1) {
    emptyState.remove();
  }

  // Create message element
  const messageEl = document.createElement("div");
  messageEl.className = `chat-message ${isOwnMessage ? "own" : "other"}`;

  const timeStr = new Date(data.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  messageEl.innerHTML = `
        <div class="chat-message-sender">${escapeHtml(data.username)}</div>
        <div class="chat-message-text">${escapeHtml(data.message)}</div>
        <div class="chat-message-time">${timeStr}</div>
    `;

  chatMessages.appendChild(messageEl);

  // Auto-scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Load chat history for a room
 */
export function loadChatHistory(messages) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages || !messages || messages.length === 0) return;

  // Clear existing messages
  chatMessages.innerHTML = "";

  // Add all messages
  messages.forEach((msg) => {
    displayChatMessage(msg);
  });
}

/**
 * Clear chat messages (when leaving a room)
 */
export function clearChat() {
  const chatMessages = document.getElementById("chatMessages");
  if (chatMessages) {
    chatMessages.innerHTML =
      '<div class="empty-state">No messages yet. Start a conversation!</div>';
  }

  const chatInput = document.getElementById("chatInput");
  if (chatInput) {
    chatInput.value = "";
  }
}
