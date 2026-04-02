/**
 * socketHandlers.js - Master Sync System for Virtual Café
 */
const db = require('./database');

// In-memory state tracking
const roomTimers = new Map(); // roomCode -> { timeRemaining, totalTime, iRunning, mode, intervalId }
const roomHosts = new Map(); // roomCode -> hostUserId (who currently has control)
const disconnectTimeouts = new Map(); // userId -> { timeoutId, roomCode }

/**
 * Initialize all socket event handlers
 * @param {Object} io - Socket.io server instance
 */
function initSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log(`[CONN] User connected: ${socket.id}`);

        // ---- ROOM MANAGEMENT ----

        socket.on('room:join', async (data) => {
            try {
                const { roomCode, userId, username } = data;
                console.log(`[JOIN] ${username} (${userId}) joining room ${roomCode}`);

                // Get room from database
                const roomResult = await db.getRoomByCode(roomCode);
                if (!roomResult.success) {
                    socket.emit('error', { message: 'Room not found' });
                    return;
                }
                const room = roomResult.result;

                // Sync disconnect cleanup
                if (disconnectTimeouts.has(userId)) {
                    clearTimeout(disconnectTimeouts.get(userId).timeoutId);
                    disconnectTimeouts.delete(userId);
                }

                // Authoritative Host Logic
                await syncRoomHost(io, roomCode, room.id, room.created_by, userId, username);
                const currentHostId = roomHosts.get(roomCode);
                const isHost = String(currentHostId).toLowerCase() === String(userId).toLowerCase();

                // Add to database if needed
                const participantsResult = await db.getParticipants(room.id);
                const participants = participantsResult.result || [];
                const existing = participants.find(p => String(p.user_id).toLowerCase() === String(userId).toLowerCase());
                
                if (!existing) {
                    if (participants.length >= room.capacity) {
                        socket.emit('error', { message: 'Room is full' });
                        return;
                    }
                    await db.addParticipant(room.id, userId, username, isHost);
                } else {
                    // Update host status if server decided they are host
                    if (existing.is_host !== isHost) {
                        await db.setHostStatus(room.id, userId, isHost);
                    }
                }

                // Setup socket session
                socket.join(roomCode);
                socket.roomCode = roomCode;
                socket.userId = userId;
                socket.username = username;
                
                // Initialize timer if first joiner
                if (!roomTimers.has(roomCode)) {
                    roomTimers.set(roomCode, {
                        timeRemaining: 25 * 60,
                        totalTime: 25 * 60,
                        isRunning: false,
                        mode: 'study',
                        intervalId: null
                    });
                }

                // Global broadcast of updated state
                await broadcastRoomUpdate(io, roomCode, room);

            } catch (error) {
                console.error('[ROOM_JOIN_ERROR]', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        socket.on('room:leave', async () => {
            await handleUserDeparture(io, socket, true);
        });

        // ---- TIMER EVENTS (Authoritative) ----

        socket.on('timer:start', () => {
            const { roomCode, userId } = socket;
            if (!isAuthoritative(roomCode, userId)) return;

            const timer = roomTimers.get(roomCode);
            if (timer && !timer.isRunning) {
                timer.isRunning = true;
                startRoomTimer(io, roomCode);
                console.log(`[TIMER] Room ${roomCode} started`);
                io.to(roomCode).emit('timer:started', getTimerPublicState(timer));
            }
        });

        socket.on('timer:pause', () => {
            const { roomCode, userId } = socket;
            if (!isAuthoritative(roomCode, userId)) return;

            const timer = roomTimers.get(roomCode);
            if (timer && timer.isRunning) {
                timer.isRunning = false;
                stopRoomTimer(roomCode);
                console.log(`[TIMER] Room ${roomCode} paused`);
                io.to(roomCode).emit('timer:paused', getTimerPublicState(timer));
            }
        });

        socket.on('timer:resume', () => {
            const { roomCode, userId } = socket;
            if (!isAuthoritative(roomCode, userId)) return;

            const timer = roomTimers.get(roomCode);
            if (timer && !timer.isRunning) {
                timer.isRunning = true;
                startRoomTimer(io, roomCode);
                console.log(`[TIMER] Room ${roomCode} resumed`);
                io.to(roomCode).emit('timer:resumed', getTimerPublicState(timer));
            }
        });

        socket.on('timer:reset', () => {
            const { roomCode, userId } = socket;
            if (!isAuthoritative(roomCode, userId)) return;

            const timer = roomTimers.get(roomCode);
            if (timer) {
                stopRoomTimer(roomCode);
                timer.isRunning = false;
                timer.mode = 'study';
                timer.timeRemaining = 25 * 60;
                timer.totalTime = 25 * 60;
                console.log(`[TIMER] Room ${roomCode} reset`);
                io.to(roomCode).emit('timer:reset', getTimerPublicState(timer));
            }
        });

        // ---- TASK EVENTS ----

        socket.on('task:add', async (data) => {
            try {
                const { roomCode, userId } = socket;
                const { title } = data;
                if (!roomCode || !title) return;

                const roomResult = await db.getRoomByCode(roomCode);
                if (!roomResult.success) return;

                const taskResult = await db.addTask(roomResult.result.id, title, userId);
                if (taskResult.success) {
                    io.to(roomCode).emit('task:added', taskResult.result);
                }
            } catch (error) {
                console.error('[TASK_ADD_ERROR]', error);
            }
        });

        socket.on('task:update', async (data) => {
            try {
                const { roomCode } = socket;
                const { taskId, updates } = data;
                if (!roomCode || !taskId) return;

                const result = await db.updateTask(taskId, updates);
                if (result.success) {
                    io.to(roomCode).emit('task:updated', result.result);
                }
            } catch (error) {
                console.error('[TASK_UPDATE_ERROR]', error);
            }
        });

        socket.on('task:delete', async (data) => {
            try {
                const { roomCode } = socket;
                const { taskId } = data;
                if (!roomCode || !taskId) return;

                const result = await db.deleteTask(taskId);
                if (result.success) {
                    io.to(roomCode).emit('task:deleted', { taskId });
                }
            } catch (error) {
                console.error('[TASK_DELETE_ERROR]', error);
            }
        });

        // ---- DISCONNECT ----

        socket.on('disconnect', () => {
            const { roomCode, userId, username } = socket;
            if (!roomCode || !userId) return;

            console.log(`[DISCONNECT] ${username} (${userId}) - Starting grace period`);
            const timeoutId = setTimeout(() => {
                handleUserDeparture(io, socket, false);
                disconnectTimeouts.delete(userId);
            }, 5000);

            disconnectTimeouts.set(userId, { timeoutId, roomCode });
        });
    });
}

/**
 * Sync the authoritative host for a room
 */
async function syncRoomHost(io, roomCode, roomId, creatorId, currentUserId, currentUsername) {
    const participantsResult = await db.getParticipants(roomId);
    const participants = participantsResult.result || [];
    
    // We decide who is host based on visibility and priority
    let newHostId = null;

    // 1. Is the creator here?
    const creator = participants.find(p => String(p.user_id).toLowerCase() === String(creatorId).toLowerCase());
    if (creator) {
        newHostId = creator.user_id;
    } else if (participants.length > 0) {
        // 2. If creator is absent, take the first person who joined
        newHostId = participants[0].user_id;
    } else {
        // 3. If room is empty, the current joiner is host
        newHostId = currentUserId;
    }

    if (newHostId) {
        console.log(`[HOST_SYNC] Room ${roomCode}: Host is ${newHostId}`);
        roomHosts.set(roomCode, newHostId);
    }
}

/**
 * Broadcast full room updates
 */
async function broadcastRoomUpdate(io, roomCode, roomObj = null) {
    try {
        const room = roomObj || (await db.getRoomByCode(roomCode)).result;
        if (!room) return;

        const participantsResult = await db.getParticipants(room.id);
        const tasksResult = await db.getTasks(room.id);
        const timerState = roomTimers.get(roomCode) || { timeRemaining: 25*60, isRunning: false, mode: 'study' };
        const currentHostId = roomHosts.get(roomCode);

        const fullParticipants = (participantsResult.result || []).map(p => ({
            ...p,
            isHost: String(p.user_id).toLowerCase() === String(currentHostId).toLowerCase()
        }));

        // Send to each user in room with THEIR specific isHost flag
        const sockets = await io.in(roomCode).fetchSockets();
        for (const s of sockets) {
            const isTargetHost = String(s.userId).toLowerCase() === String(currentHostId).toLowerCase();
            s.emit('room:state', {
                room,
                tasks: tasksResult.result || [],
                participants: fullParticipants,
                timer: getTimerPublicState(timerState),
                isHost: isTargetHost // AUTHORITATIVE FLAG
            });
        }
    } catch (error) {
        console.error('[BROADCAST_ERROR]', error);
    }
}

/**
 * Handle user leaving or disconnecting
 */
async function handleUserDeparture(io, socket, isExplicit) {
    const { roomCode, userId, username } = socket;
    if (!roomCode || !userId) return;

    try {
        const roomResult = await db.getRoomByCode(roomCode);
        if (roomResult.success) {
            const room = roomResult.result;
            await db.removeParticipant(room.id, userId);

            // Host Cleanup
            const currentHostId = roomHosts.get(roomCode);
            if (String(userId).toLowerCase() === String(currentHostId).toLowerCase()) {
                console.log(`[HOST_EXIT] Host ${username} left room ${roomCode}`);
                
                // Try to find a new host
                const othersResult = await db.getParticipants(room.id);
                const others = othersResult.result || [];
                if (others.length === 0) {
                    // Everyone left? Close it.
                    console.log(`[ROOM_CLOSE] Room ${roomCode} is now empty. Cleaning up.`);
                    await db.deleteRoom(room.id);
                    stopRoomTimer(roomCode);
                    roomTimers.delete(roomCode);
                    roomHosts.delete(roomCode);
                } else {
                    // Assign new host
                    const nextHostId = others[0].user_id;
                    roomHosts.set(roomCode, nextHostId);
                    await broadcastRoomUpdate(io, roomCode, room);
                }
            } else {
                io.to(roomCode).emit('participant:left', { userId });
                await broadcastRoomUpdate(io, roomCode, room);
            }
        }
        if (isExplicit) socket.leave(roomCode);
    } catch (e) { console.error('[EXIT_ERROR]', e); }
}

function isAuthoritative(roomCode, userId) {
    const hostId = roomHosts.get(roomCode);
    return String(hostId).toLowerCase() === String(userId).toLowerCase();
}

function startRoomTimer(io, roomCode) {
    const timer = roomTimers.get(roomCode);
    if (!timer) return;
    stopRoomTimer(roomCode);

    timer.intervalId = setInterval(() => {
        if (timer.timeRemaining > 0) {
            timer.timeRemaining--;
            io.to(roomCode).emit('timer:tick', getTimerPublicState(timer));
        } else {
            timer.mode = timer.mode === 'study' ? 'break' : 'study';
            timer.timeRemaining = timer.mode === 'study' ? 25*60 : 5*60;
            timer.totalTime = timer.timeRemaining;
            io.to(roomCode).emit('timer:transitioned', getTimerPublicState(timer));
        }
    }, 1000);
}

function stopRoomTimer(roomCode) {
    const timer = roomTimers.get(roomCode);
    if (timer && timer.intervalId) {
        clearInterval(timer.intervalId);
        timer.intervalId = null;
    }
}

function getTimerPublicState(timer) {
    return {
        timeRemaining: timer.timeRemaining,
        mode: timer.mode,
        isRunning: timer.isRunning,
        totalTime: timer.totalTime || 25*60
    };
}

module.exports = initSocketHandlers;
