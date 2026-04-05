/**
 * Main Application Entry Point for Virtual Café
 */

import { initSocket, getSocket, setSocketState, getSocketState, disconnectSocket } from './modules/socket.js';
import { 
    showHomePage, showLandingPage, showLoginPage, showSignupPage, 
    toggleAmbientSounds, showRoomPage 
} from './modules/ui.js';
import { handleLoginSubmit, handleSignupSubmit, verifyToken, logout } from './modules/auth.js';
import { loadPublicRooms } from './modules/api.js';
import { 
    handleCreateRoom, joinRoomWithUsername, leaveRoom, joinByCode, cancelJoinRequest,
    updateRoomUI, updateParticipants, updateHostInfo 
} from './modules/room.js';
import { updateTimerUI, startTimer, pauseTimer, resumeTimer, resetTimer } from './modules/timer.js';
import { addTask, updateTaskCompletion, deleteTask, updateTasksUI } from './modules/tasks.js';
import { showNotification } from './modules/utils.js';
import { toggleSound, updateSoundVolume, loadSoundPreferences, stopAllSounds } from './modules/sound.js';

// Global access for HTML onclick handlers
window.showLoginPage = showLoginPage;
window.showSignupPage = showSignupPage;
window.showHomePage = showHomePage;
window.handleLoginSubmit = handleLoginSubmit;
window.handleSignupSubmit = handleSignupSubmit;
window.toggleAmbientSounds = toggleAmbientSounds;
window.toggleSound = toggleSound;
window.updateSoundVolume = updateSoundVolume;
window.joinRoom = (roomCode) => {
    const username = localStorage.getItem('currentUsername') || localStorage.getItem('userEmail').split('@')[0];
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

/**
 * Restore session from localStorage
 */
async function restoreSession() {
    const accessToken = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');

    if (!accessToken || !userId) {
        showHomePage();
        return;
    }

    try {
        const isValid = await verifyToken();
        if (isValid) {
            document.getElementById('currentUserDisplay').textContent = `Welcome, ${userEmail.split('@')[0]}`;
            
            const roomCode = localStorage.getItem('currentRoom');
            const username = localStorage.getItem('currentUsername');
            const currentPage = localStorage.getItem('currentPage');
            
            if (roomCode && username && currentPage === 'roomPage') {
                await joinRoomWithUsername(roomCode, username, localStorage.getItem('isRoomHost') === 'true');
            } else {
                showLandingPage();
                loadPublicRooms();
            }
        } else {
            localStorage.clear();
            showHomePage();
        }
    } catch (error) {
        console.error('Session restoration error:', error);
        showHomePage();
    }
}

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Initial session check
    await restoreSession();
    
    // Auth success listener
    window.addEventListener('auth:success', () => {
        loadPublicRooms();
    });

    // Global event listeners for input fields
    setupEventListeners();

    // Socket Initialization & Event Handlers
    setupSocketEvents();
});

function setupEventListeners() {
    const taskInput = document.getElementById('taskInput');
    if (taskInput) {
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });
    }

    const joinCodeInput = document.getElementById('joinRoomCode');
    if (joinCodeInput) {
        joinCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') joinByCode();
        });
    }

    // Generic form enter listeners could be added here
}

function setupSocketEvents() {
    // We only set up these once
    const socket = initSocket();

    socket.on('room:state', (state) => {
        console.log('[SYNC] Received authoritative state:', state);
        
        const username = localStorage.getItem('currentUsername') || localStorage.getItem('userEmail').split('@')[0];
        
        // Trust the server's isHost flag 100%
        setSocketState(state.room ? state.room.room_code : null, username, state.isHost, state);
        
        updateRoomUI(state);
        updateParticipants(state.participants || []);
        updateTasksUI(state.tasks || []);
        updateTimerUI(state.timer || {});
        updateHostInfo();

        // Load saved sound preferences when entering a room
        loadSoundPreferences();
    });

    socket.on('participant:joined', (data) => {
        const { roomState } = getSocketState();
        if (data.participants) {
            roomState.participants = data.participants;
            updateParticipants(data.participants);
        }
        if (data.username) {
            showNotification(`${data.username} joined the room`);
        }
    });

    socket.on('participant:left', (data) => {
        const { roomState } = getSocketState();
        if (roomState.participants) {
            roomState.participants = roomState.participants.filter(p => p.user_id !== data.userId);
            updateParticipants(roomState.participants);
        }
        showNotification('A participant left the room');
    });

    socket.on('timer:started', (timerState) => updateTimerUI(timerState));
    socket.on('timer:paused', (timerState) => updateTimerUI(timerState));
    socket.on('timer:resumed', (timerState) => updateTimerUI(timerState));
    socket.on('timer:reset', (timerState) => updateTimerUI(timerState));
    socket.on('timer:tick', (timerState) => updateTimerUI(timerState));
    
    socket.on('timer:transitioned', (timerState) => {
        updateTimerUI(timerState);
        showNotification(`Mode changed to ${timerState.mode === 'study' ? 'Study' : 'Break'}`);
    });

    socket.on('task:added', (task) => {
        const { roomState } = getSocketState();
        if (roomState.tasks) {
            roomState.tasks.push(task);
            updateTasksUI(roomState.tasks);
        }
    });

    socket.on('task:updated', (updatedTask) => {
        const { roomState } = getSocketState();
        if (roomState && roomState.tasks) {
            const index = roomState.tasks.findIndex(t => t.id === updatedTask.id);
            if (index !== -1) {
                roomState.tasks[index] = updatedTask;
                updateTasksUI(roomState.tasks);
            }
        }
    });

    socket.on('task:deleted', (data) => {
        const { roomState } = getSocketState();
        if (roomState && roomState.tasks) {
            roomState.tasks = roomState.tasks.filter(t => t.id !== data.taskId);
            updateTasksUI(roomState.tasks);
        }
    });

    socket.on('room:closed', (data) => {
        showNotification(data.message, true);
        stopAllSounds();
        leaveRoom();
    });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    disconnectSocket();
});
