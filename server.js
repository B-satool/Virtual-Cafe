// Virtual Cafe Server
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const db = require('./src/database');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

app.use(express.json({ limit: '10kb' })); // Limit request size
app.use(express.static('public'));

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// Input validation helper
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
}

function validatePassword(password) {
    return password && password.length >= 8 && password.length <= 128;
}

function validateName(name) {
    return name && name.length >= 2 && name.length <= 100;
}

// ============================================
// EMAIL CONFIRMATION CALLBACK HANDLER
// ============================================

app.get('/auth/callback', (req, res) => {
    try {
        const { access_token, refresh_token, type } = req.query;

        if (!access_token) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Email Confirmation</title>
                    <style>
                        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f1ee; }
                        .container { text-align: center; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1); }
                        h1 { color: #5c4033; }
                        button { background: #6d4c41; color: white; padding: 12px 30px; border: none; border-radius: 8px; cursor: pointer; font-size: 1em; }
                        button:hover { background: #5d4037; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>✅ Email Confirmed!</h1>
                        <p>Your email has been successfully confirmed.</p>
                        <button onclick="window.location.href='/'" >Back to Virtual Café</button>
                    </div>
                </body>
                </html>
            `);
        }

        // If tokens are present, store them and redirect to app
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Email Confirmation</title>
                <style>
                    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f1ee; }
                    .container { text-align: center; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1); }
                    h1 { color: #5c4033; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>✅ Email Confirmed!</h1>
                    <p>Your email has been successfully confirmed. Redirecting...</p>
                </div>
                <script>
                    // Store tokens if provided
                    if ('${access_token}') {
                        localStorage.setItem('accessToken', '${access_token}');
                        localStorage.setItem('refreshToken', '${refresh_token}');
                    }
                    // Redirect to app after 2 seconds
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Callback error:', error);
        res.status(500).send('Error processing email confirmation');
    }
});


async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        const token = authHeader.slice(7); // Remove 'Bearer ' prefix
        const userId = req.body.userId || req.params.userId;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Verify token with database
        const verifyResult = await db.verifyToken(token);
        
        if (!verifyResult.success || !verifyResult.user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Attach user info to request
        req.user = verifyResult.user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Token verification failed' });
    }
}

// Generate random 6-digit room code
function generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================
// IN-MEMORY STATE
// ============================================

const activeRooms = new Map(); // room code -> { room data, participants, tasks, timer }

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;

        // Validate required fields
        if (!email || !password || !fullName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate input format
        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({ error: 'Password must be 8-128 characters' });
        }

        if (!validateName(fullName)) {
            return res.status(400).json({ error: 'Full name must be 2-100 characters' });
        }

        // Check password strength
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and numbers' });
        }

        const result = await db.signUp(email, password, fullName);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.status(201).json({
            userId: result.userId,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Validate input format
        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const result = await db.logIn(email, password);

        if (!result.success) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.json({
            userId: result.userId,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/verify', verifyToken, async (req, res) => {
    try {
        // If verifyToken middleware passed, token is valid
        res.json({
            success: true,
            userId: req.user.id,
            email: req.user.email
        });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(401).json({ error: 'Verification failed' });
    }
});

app.post('/api/auth/logout', verifyToken, async (req, res) => {
    try {
        // Logout is handled client-side by clearing tokens
        // Backend just acknowledges the logout request
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/auth/profile/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Security: Users can only access their own profile
        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Unauthorized access to profile' });
        }

        const result = await db.getUserProfile(userId);

        if (!result.success) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json(result.result);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/auth/profile/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        // Security: Users can only update their own profile
        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Unauthorized access to profile' });
        }

        // Sanitize updates - only allow certain fields
        const allowedFields = ['full_name', 'avatar_url'];
        const sanitizedUpdates = {};
        
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                sanitizedUpdates[field] = updates[field];
            }
        });

        const result = await db.updateUserProfile(userId, sanitizedUpdates);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json(result.result[0]);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// ROOM ENDPOINTS
// ============================================

app.get('/api/rooms/public', async (req, res) => {
    try {
        const result = await db.getPublicRooms();

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json(result.result);
    } catch (error) {
        console.error('Get public rooms error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/rooms', async (req, res) => {
    try {
        const { roomName, isPublic, requiresApproval, capacity, createdBy } = req.body;

        if (!roomName) {
            return res.status(400).json({ error: 'Room name is required' });
        }

        let roomCode = generateRoomCode();
        let codeExists = true;

        // Ensure unique room code
        while (codeExists) {
            const checkResult = await db.checkRoomExists(roomCode);
            if (checkResult.success && !checkResult.exists) {
                codeExists = false;
            } else {
                roomCode = generateRoomCode();
            }
        }

        const result = await db.createRoom(
            roomName,
            isPublic !== false,
            roomCode,
            requiresApproval === true,
            capacity || 10,
            createdBy
        );

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        // Initialize in-memory state
        activeRooms.set(roomCode, {
            room: result.result,
            participants: [],
            tasks: [],
            timer: {
                isRunning: false,
                mode: 'study',
                timeRemaining: 25 * 60,
                totalTime: 25 * 60
            }
        });

        res.status(201).json(result.result);
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/rooms/:code', async (req, res) => {
    try {
        const { code } = req.params;

        const result = await db.getRoomByCode(code);

        if (!result.success) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json(result.result);
    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// SOCKET.IO HANDLERS
// ============================================

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // ---- ROOM MANAGEMENT ----

    socket.on('room:join', async (data) => {
        try {
            const { roomCode, userId, username } = data;

            // Get room from database
            const roomResult = await db.getRoomByCode(roomCode);
            if (!roomResult.success) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }

            const room = roomResult.result;
            socket.join(roomCode);
            socket.roomCode = roomCode;
            socket.userId = userId;
            socket.username = username;
            socket.isHost = false;

            // Add to database
            await db.addParticipant(room.id, userId, username, false);

            // Get current room state
            const participantsResult = await db.getParticipants(room.id);
            const tasksResult = await db.getTasks(room.id);
            const timerResult = await db.getLatestTimerState(room.id);

            const roomState = {
                room,
                participants: participantsResult.result || [],
                tasks: tasksResult.result || [],
                timer: timerResult.result || {
                    isRunning: false,
                    mode: 'study',
                    timeRemaining: 25 * 60,
                    totalTime: 25 * 60
                }
            };

            // Send room state to joining user
            socket.emit('room:state', roomState);

            // Notify others
            socket.to(roomCode).emit('participant:joined', {
                userId,
                username,
                participants: roomState.participants
            });

        } catch (error) {
            console.error('Room join error:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    socket.on('room:join-request', async (data) => {
        try {
            const { roomCode, userId, username } = data;

            // Get room from database
            const roomResult = await db.getRoomByCode(roomCode);
            if (!roomResult.success) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }

            const room = roomResult.result;

            // Create join request
            const requestResult = await db.createJoinRequest(room.id, userId, username);
            if (!requestResult.success) {
                socket.emit('error', { message: 'Failed to create join request' });
                return;
            }

            // Notify host
            io.to(roomCode).emit('request:pending', {
                requestId: requestResult.result.id,
                userId,
                username,
                roomId: room.id
            });

            // Send waiting room message to requester
            socket.emit('waiting:room', {
                message: 'Your request is pending approval from the host'
            });

        } catch (error) {
            console.error('Join request error:', error);
            socket.emit('error', { message: 'Failed to create join request' });
        }
    });

    socket.on('request:approve', async (data) => {
        try {
            const { requestId, userId } = data;

            // Approve request
            const result = await db.approveJoinRequest(requestId);
            if (!result.success) {
                socket.emit('error', { message: 'Failed to approve request' });
                return;
            }

            // Notify user
            io.to(`user-${userId}`).emit('request:approved', {
                message: 'Your join request has been approved'
            });

        } catch (error) {
            console.error('Approve request error:', error);
            socket.emit('error', { message: 'Failed to approve request' });
        }
    });

    socket.on('request:reject', async (data) => {
        try {
            const { requestId, userId } = data;

            // Reject request
            const result = await db.rejectJoinRequest(requestId);
            if (!result.success) {
                socket.emit('error', { message: 'Failed to reject request' });
                return;
            }

            // Notify user
            io.to(`user-${userId}`).emit('request:rejected', {
                message: 'Your join request has been rejected'
            });

        } catch (error) {
            console.error('Reject request error:', error);
            socket.emit('error', { message: 'Failed to reject request' });
        }
    });

    socket.on('room:leave', async (data) => {
        try {
            const { roomCode, userId } = data;

            if (!roomCode) return;

            // Get room
            const roomResult = await db.getRoomByCode(roomCode);
            if (roomResult.success) {
                const room = roomResult.result;
                
                // Remove participant
                await db.removeParticipant(room.id, userId);

                // Check if the leaving user is the host
                const participantsResult = await db.getParticipants(room.id);
                const participants = participantsResult.result || [];
                const hostParticipant = participants.find(p => p.is_host);

                // If the user leaving was the host, delete the room
                if (hostParticipant && hostParticipant.user_id === userId) {
                    await db.deleteRoom(room.id);
                    io.to(roomCode).emit('room:closed', { 
                        message: 'Room host has left. Room is now closed.' 
                    });
                } else {
                    // Notify others that a participant left
                    socket.to(roomCode).emit('participant:left', { userId });
                }
            }

            socket.leave(roomCode);
        } catch (error) {
            console.error('Room leave error:', error);
        }
    });

    // ---- TIMER EVENTS ----

    socket.on('timer:start', async (data) => {
        try {
            const { roomCode, mode, totalTime } = data;
            if (!roomCode) return;

            const timerState = {
                isRunning: true,
                mode: mode || 'study',
                timeRemaining: totalTime || 25 * 60,
                totalTime: totalTime || 25 * 60
            };

            // Emit to all in room
            io.to(roomCode).emit('timer:tick', timerState);

        } catch (error) {
            console.error('Timer start error:', error);
        }
    });

    socket.on('timer:pause', (data) => {
        try {
            const { roomCode } = data;
            if (!roomCode) return;

            io.to(roomCode).emit('timer:paused');
        } catch (error) {
            console.error('Timer pause error:', error);
        }
    });

    socket.on('timer:resume', (data) => {
        try {
            const { roomCode } = data;
            if (!roomCode) return;

            io.to(roomCode).emit('timer:resumed');
        } catch (error) {
            console.error('Timer resume error:', error);
        }
    });

    socket.on('timer:reset', (data) => {
        try {
            const { roomCode } = data;
            if (!roomCode) return;

            io.to(roomCode).emit('timer:reset', {
                timeRemaining: 25 * 60,
                totalTime: 25 * 60
            });
        } catch (error) {
            console.error('Timer reset error:', error);
        }
    });

    socket.on('timer:tick', (data) => {
        try {
            const { roomCode, timeRemaining } = data;
            if (!roomCode) return;

            socket.to(roomCode).emit('timer:tick', {
                timeRemaining,
                isRunning: true
            });
        } catch (error) {
            console.error('Timer tick error:', error);
        }
    });

    // ---- TASK EVENTS ----

    socket.on('task:add', async (data) => {
        try {
            const { roomCode, title } = data;
            if (!roomCode || !title) return;

            const roomResult = await db.getRoomByCode(roomCode);
            if (!roomResult.success) return;

            const taskResult = await db.addTask(roomResult.result.id, title, socket.userId);
            if (!taskResult.success) return;

            io.to(roomCode).emit('task:added', taskResult.result);
        } catch (error) {
            console.error('Task add error:', error);
        }
    });

    socket.on('task:update', async (data) => {
        try {
            const { roomCode, taskId, updates } = data;
            if (!roomCode || !taskId) return;

            const result = await db.updateTask(taskId, updates);
            if (!result.success) return;

            io.to(roomCode).emit('task:updated', result.result);
        } catch (error) {
            console.error('Task update error:', error);
        }
    });

    socket.on('task:delete', async (data) => {
        try {
            const { roomCode, taskId } = data;
            if (!roomCode || !taskId) return;

            const result = await db.deleteTask(taskId);
            if (!result.success) return;

            io.to(roomCode).emit('task:deleted', { taskId });
        } catch (error) {
            console.error('Task delete error:', error);
        }
    });

    // ---- CONNECTION/DISCONNECTION ----

    socket.on('disconnect', async () => {
        try {
            if (socket.roomCode && socket.userId) {
                const roomResult = await db.getRoomByCode(socket.roomCode);
                if (roomResult.success) {
                    const room = roomResult.result;
                    await db.removeParticipant(room.id, socket.userId);

                    // Check if the disconnected user is the host
                    const participantsResult = await db.getParticipants(room.id);
                    const participants = participantsResult.result || [];
                    const hostParticipant = participants.find(p => p.is_host);

                    // If the host disconnected, delete the room
                    if (hostParticipant && hostParticipant.user_id === socket.userId) {
                        await db.deleteRoom(room.id);
                        io.to(socket.roomCode).emit('room:closed', { 
                            message: 'Room host has disconnected. Room is now closed.' 
                        });
                    } else {
                        // Notify others that a participant left
                        socket.to(socket.roomCode).emit('participant:left', { userId: socket.userId });
                    }
                }
            }
            console.log(`User disconnected: ${socket.id}`);
        } catch (error) {
            console.error('Disconnect error:', error);
        }
    });
});

// ============================================
// SERVER STARTUP
// ============================================

server.listen(PORT, () => {
    console.log(`Virtual Café server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
