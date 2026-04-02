/**
 * Room Management for Virtual Café
 */

import { getSocket, initSocket, setSocketState, getSocketState, disconnectSocket } from './socket.js';
import { showRoomPage, showLandingPage, showHomePage, showWaitingRoom, hideAllPages } from './ui.js';
import { showNotification, escapeHtml, sanitizeInput } from './utils.js';
import { createNewRoom, loadPublicRooms } from './api.js';

/**
 * Update the room UI with current state
 */
export function updateRoomUI(state) {
    const { currentRoom } = getSocketState();
    const room = state.room || state;
    const roomName = room.room_name || room.roomName || 'Study Room';
    const roomCode = room.room_code || room.roomCode || currentRoom;
    const isPublic = room.is_public !== undefined ? room.is_public : (room.isPublic || false);
    const participantCount = state.participants ? state.participants.length : (state.participantCount || 0);
    const timerState = state.timerState || state.timer || {};
    
    document.getElementById('currentRoomTitle').textContent = roomName;
    document.getElementById('currentRoomSubtitle').textContent = isPublic ? '(Public Room)' : '(Private Room)';
    document.getElementById('roomCodeDisplay').textContent = roomCode;
    document.getElementById('participantCountDisplay').textContent = participantCount;
    document.getElementById('sessionCountDisplay').textContent = (timerState.sessionCount || 0) + 1;
}

/**
 * Update host-specific information and controls
 */
export function updateHostInfo() {
    const { isHost, roomState } = getSocketState();
    const hostInfo = document.getElementById('hostInfo');
    const pendingPanel = document.getElementById('pendingRequestsPanel');
    
    if (isHost) {
        hostInfo.textContent = '👑 You are the Room Host';
        if (roomState.requiresApproval && pendingPanel) {
            pendingPanel.style.display = 'block';
        }
    } else {
        hostInfo.textContent = '📍 You are a participant';
        if (pendingPanel) {
            pendingPanel.style.display = 'none';
        }
    }
    
    const timerControls = document.getElementById('timerControls');
    if (!isHost) {
        timerControls.classList.add('disabled-controls');
    } else {
        timerControls.classList.remove('disabled-controls');
    }
}

/**
 * Update the participants list UI
 */
export function updateParticipants(participants) {
    const participantList = document.getElementById('participantList');
    if (!participantList) return;

    if (!participants || participants.length === 0) {
        participantList.innerHTML = '<div class="empty-state">No participants</div>';
        return;
    }

    participantList.innerHTML = participants.map(p => {
        const isPHost = p.isHost || p.is_host || false;
        return `
        <div class="participant">
            <div class="participant-avatar">${p.username.charAt(0).toUpperCase()}</div>
            <div class="participant-info">
                <div class="participant-name">${escapeHtml(p.username)} ${isPHost ? '⭐' : ''}</div>
                <div class="participant-status">${isPHost ? '👑 Host' : 'Member'}</div>
            </div>
        </div>
    `;}).join('');
}

/**
 * Handle room creation flow
 */
export async function handleCreateRoom() {
    const roomNameInput = document.getElementById('roomName');
    const capacityInput = document.getElementById('capacity');
    const isPublicInput = document.getElementById('isPublic');
    
    const roomName = roomNameInput.value.trim();
    if (!roomName) {
        showNotification('Please enter a room name', true);
        return;
    }

    try {
        const roomData = {
            roomName: sanitizeInput(roomName),
            capacity: parseInt(capacityInput.value) || 10,
            isPublic: isPublicInput.checked,
            createdBy: localStorage.getItem('userId')
        };
        
        const username = localStorage.getItem('userEmail').split('@')[0];
        const data = await createNewRoom(roomData);
        
        if (data.room_code) {
            await joinRoomWithUsername(data.room_code, username, true);
        }
    } catch (error) {
        showNotification(error.message, true);
    }
}

/**
 * Join a room with a username
 */
export async function joinRoomWithUsername(roomCode, username, isCreator = false) {
    if (!roomCode || !username) return;

    try {
        localStorage.setItem('currentRoom', roomCode);
        localStorage.setItem('currentUsername', username);
        localStorage.setItem('isRoomHost', isCreator);
        
        setSocketState(roomCode, username, isCreator, null);
        updateHostInfo();
        
        const socket = initSocket();
        socket.emit('room:join', {
            roomCode,
            username,
            userId: localStorage.getItem('userId')
        });
        
        showRoomPage();
    } catch (error) {
        console.error('Error joining room:', error);
        showNotification('Failed to join room', true);
    }
}

/**
 * Leave the current room
 */
export function leaveRoom() {
    const { currentRoom, socket } = getSocketState();
    
    if (socket) {
        socket.emit('room:leave', { 
            roomCode: currentRoom, 
            userId: localStorage.getItem('userId')
        });
        disconnectSocket();
    }
    
    localStorage.removeItem('currentRoom');
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('isRoomHost');

    showLandingPage();
    loadPublicRooms();
    
    // Clear room UI
    document.getElementById('currentRoomTitle').textContent = 'Loading Room...';
    document.getElementById('taskInput').value = '';
    document.getElementById('taskList').innerHTML = '';
    document.getElementById('participantList').innerHTML = '';
}

/**
 * Join a room by entering its 6-digit code
 */
export function joinByCode() {
    const codeInput = document.getElementById('joinRoomCode');
    const code = codeInput.value.trim();
    
    if (!code || code.length !== 6) {
        showNotification('Please enter a valid 6-digit code', true);
        return;
    }
    
    const username = localStorage.getItem('currentUsername') || localStorage.getItem('userEmail').split('@')[0];
    joinRoomWithUsername(code, username);
    codeInput.value = '';
}

/**
 * Cancel a pending join request
 */
export function cancelJoinRequest() {
    const { socket } = getSocketState();
    const roomCode = localStorage.getItem('currentRoom');
    if (socket && roomCode) {
        socket.emit('room:cancel-request', { roomCode });
    }
    localStorage.removeItem('currentRoom');
    showLandingPage();
    loadPublicRooms();
}
