/**
 * Timer Management for Virtual Café - Master Sync Client
 */

import { getSocket, getSocketState } from './socket.js';
import { formatTime, showNotification } from './utils.js';

/**
 * Update the timer UI based on server-authoritative state
 */
export function updateTimerUI(timerState) {
    const timerDisplay = document.getElementById('timerDisplay');
    if (!timerDisplay) return;
    
    // Sync time
    const timeRemaining = timerState.timeRemaining !== undefined ? timerState.timeRemaining : 1500;
    timerDisplay.textContent = formatTime(timeRemaining);
    
    // Sync mode
    const timerMode = document.getElementById('timerMode');
    if (timerMode && timerState.mode) {
        timerMode.textContent = timerState.mode === 'study' ? '📚 Study Mode' : '☕ Break Time';
        timerMode.className = `timer-mode ${timerState.mode}`;
    }

    // Sync controls visibility and state
    const timerControls = document.getElementById('timerControls');
    if (timerControls) {
        const { isHost } = getSocketState();
        
        // Master switch for host controls
        timerControls.style.display = isHost ? 'flex' : 'none';
        
        if (isHost) {
            const startBtn = document.getElementById('startTimerBtn');
            const pauseBtn = document.getElementById('pauseTimerBtn');
            const resumeBtn = document.getElementById('resumeTimerBtn');
            const resetBtn = document.getElementById('resetTimerBtn');

            const isRunning = timerState.isRunning;
            const totalTime = timerState.totalTime || (timerState.mode === 'study' ? 1500 : 300);

            if (isRunning) {
                if (startBtn) startBtn.style.display = 'none';
                if (pauseBtn) pauseBtn.style.display = 'inline-block';
                if (resumeBtn) resumeBtn.style.display = 'none';
            } else {
                if (timeRemaining < totalTime) {
                    // Paused
                    if (startBtn) startBtn.style.display = 'none';
                    if (pauseBtn) pauseBtn.style.display = 'none';
                    if (resumeBtn) resumeBtn.style.display = 'inline-block';
                } else {
                    // Stopped/Reset
                    if (startBtn) startBtn.style.display = 'inline-block';
                    if (pauseBtn) pauseBtn.style.display = 'none';
                    if (resumeBtn) resumeBtn.style.display = 'none';
                }
            }
        }
    }
}

/**
 * Timer Control Signals to Server
 */

export function startTimer() {
    console.log('[SYNC] Emitting timer:start');
    const { socket } = getSocketState();
    socket.emit('timer:start');
}

export function pauseTimer() {
    console.log('[SYNC] Emitting timer:pause');
    const { socket } = getSocketState();
    socket.emit('timer:pause');
}

export function resumeTimer() {
    console.log('[SYNC] Emitting timer:resume');
    const { socket } = getSocketState();
    socket.emit('timer:resume');
}

export function resetTimer() {
    console.log('[SYNC] Emitting timer:reset');
    const { socket } = getSocketState();
    socket.emit('timer:reset');
}
