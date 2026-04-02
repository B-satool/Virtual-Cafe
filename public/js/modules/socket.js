/**
 * Socket Management for Virtual Café
 */

import { showNotification } from './utils.js';

let socket = null;
let currentRoom = null;
let currentUsername = null;
let isHost = false;
let roomState = { tasks: [], participants: [], timer: {} };

/**
 * Initialize socket connection
 */
export function initSocket() {
    if (socket) return socket;
    
    // Connect to the server
    socket = io();
    
    // Global socket event listeners
    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });

    socket.on('error', (data) => {
        showNotification(data.message || 'An error occurred', true);
        import('./ui.js').then(ui => ui.showLandingPage());
        import('./room.js').then(room => {
            localStorage.removeItem('currentRoom');
            room.loadPublicRooms();
        });
    });

    return socket;
}

/**
 * Disconnect socket and clear state
 */
export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    clearSocketState();
}

/**
 * Clear the internal socket state
 */
export function clearSocketState() {
    currentRoom = null;
    currentUsername = null;
    isHost = false;
    roomState = { tasks: [], participants: [], timer: {} };
}

/**
 * Get the current socket instance
 */
export function getSocket() {
    return socket;
}

/**
 * Set the current room state
 * @param {string} roomCode - The room code
 * @param {string} username - The username
 * @param {boolean} hostStatus - Whether the user is the host
 * @param {Object} state - The room state
 */
export function setSocketState(roomCode, username, hostStatus, state) {
    if (roomCode) currentRoom = roomCode;
    if (username) currentUsername = username;
    if (hostStatus !== undefined) isHost = hostStatus;
    if (state) roomState = state;
}

/**
 * Get internal state variables
 */
export function getSocketState() {
    return {
        currentRoom,
        currentUsername,
        isHost,
        roomState,
        socket
    };
}
