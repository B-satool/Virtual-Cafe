/**
 * API Interactions for Virtual Café
 */

import { getHeaders, sanitizeInput, showError } from './utils.js';

/**
 * Load public rooms for the landing page
 */
export async function loadPublicRooms() {
    const roomsList = document.getElementById('publicRoomsList');
    if (!roomsList) return;
    
    roomsList.innerHTML = '<div class="empty-state">Loading rooms...</div>';

    try {
        const response = await fetch('/api/rooms', {
            method: 'GET',
            headers: getHeaders(true)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            roomsList.innerHTML = `<div class="error-message show">${data.error || 'Failed to load rooms'}</div>`;
            return;
        }

        const rooms = data.result || [];
        
        if (rooms.length === 0) {
            roomsList.innerHTML = '<div class="empty-state">No public rooms available. Create one to get started!</div>';
            return;
        }

        roomsList.innerHTML = rooms.map(room => {
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
            return `
            <div class="room-item" onclick="window.joinRoom('${room.room_code}')">
                <div class="room-item-info">
                    <div style="display: flex; flex-direction: column;">
                        <span class="room-item-name">${sanitizeInput(room.room_name)}</span>
                        <span style="font-size: 0.85em; color: #666; margin-top: 4px;">👑 Host: ${sanitizeInput(room.host_username || 'Unknown')}</span>
                    </div>
                    <span class="room-item-count">👥 ${room.participant_count || 0}/${room.capacity}</span>
                </div>
                <div class="room-status ${statusClass}">
                    ${statusText}
                    ${room.requires_approval ? '🔒 Private' : '🔓 Public'}
                </div>
            </div>
        `;}).join('');

    } catch (error) {
        console.error('Error loading rooms:', error);
        roomsList.innerHTML = '<div class="error-message show">An error occurred while loading rooms.</div>';
    }
}

/**
 * Create a new room
 */
export async function createNewRoom(roomData) {
    try {
        const response = await fetch('/api/rooms', {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(roomData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create room');
        }
        
        return data;
    } catch (error) {
        console.error('Create room error:', error);
        throw error;
    }
}
