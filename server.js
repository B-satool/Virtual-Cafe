require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Import database functions
const db = require('./src/database');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// IN-MEMORY CACHE (for real-time updates)
// ============================================

// Store active room sessions in memory for real-time sync
const activeRooms = new Map(); // roomId -> { timerState, participants, tasks }
const timerIntervals = new Map(); // roomId -> intervalId

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateRandomRoomCode() {
  return Math.floor(Math.random() * 900000 + 100000).toString();
}

async function initializeRoom(roomId) {
  // Get room data from database
  const roomResult = await db.getRoomById(roomId);
  if (!roomResult.success || !roomResult.room) return null;

  const participantsResult = await db.getParticipants(roomId);
  const tasksResult = await db.getTasks(roomId);
  const timerResult = await db.getLatestTimerState(roomId);

  const room = {
    id: roomResult.room.id,
    roomCode: roomResult.room.room_code,
    roomName: roomResult.room.room_name,
    isPublic: roomResult.room.is_public,
    capacity: roomResult.room.capacity,
    participants: participantsResult.success ? participantsResult.participants : [],
    tasks: tasksResult.success ? tasksResult.tasks : [],
    timerState: timerResult.success && timerResult.timerState ? {
      isRunning: timerResult.timerState.is_running,
      mode: timerResult.timerState.mode,
      timeRemaining: timerResult.timerState.time_remaining,
      totalTime: timerResult.timerState.total_time,
      startedAt: timerResult.timerState.started_at,
      pausedAt: timerResult.timerState.paused_at,
      sessionCount: timerResult.timerState.session_count
    } : {
      isRunning: false,
      mode: 'study',
      timeRemaining: 25 * 60,
      totalTime: 25 * 60,
      startedAt: null,
      pausedAt: null,
      sessionCount: 0
    }
  };

  activeRooms.set(roomId, room);
  return room;
}

function getRoomFullState(room) {
  return {
    id: room.id,
    roomCode: room.roomCode,
    roomName: room.roomName,
    isPublic: room.isPublic,
    requiresApproval: room.requiresApproval,
    capacity: room.capacity,
    participants: room.participants,
    tasks: room.tasks,
    timerState: room.timerState,
    participantCount: room.participants.length
  };
}

// ============================================
// TIMER MANAGEMENT
// ============================================

function startRoomTimer(roomId) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  room.timerState.isRunning = true;
  room.timerState.startedAt = new Date().toISOString();
  room.timerState.pausedAt = null;

  io.to(roomId).emit('timer:started', room.timerState);

  // Clear existing interval if any
  if (timerIntervals.has(roomId)) {
    clearInterval(timerIntervals.get(roomId));
  }

  // Set up timer interval
  const interval = setInterval(async () => {
    const room = activeRooms.get(roomId);
    if (!room) {
      clearInterval(interval);
      timerIntervals.delete(roomId);
      return;
    }

    if (room.timerState.isRunning && room.timerState.timeRemaining > 0) {
      room.timerState.timeRemaining -= 1;
      io.to(roomId).emit('timer:tick', room.timerState);

      if (room.timerState.timeRemaining === 0) {
        transitionTimerMode(roomId);
      }
    }
  }, 1000);

  timerIntervals.set(roomId, interval);
}

function pauseRoomTimer(roomId) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  room.timerState.isRunning = false;
  room.timerState.pausedAt = new Date().toISOString();

  io.to(roomId).emit('timer:paused', room.timerState);
}

function resumeRoomTimer(roomId) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  room.timerState.isRunning = true;
  const elapsedSeconds = (new Date() - new Date(room.timerState.startedAt)) / 1000;
  room.timerState.startedAt = new Date(Date.now() - (room.timerState.totalTime - room.timerState.timeRemaining) * 1000).toISOString();
  room.timerState.pausedAt = null;

  io.to(roomId).emit('timer:resumed', room.timerState);
}

function resetRoomTimer(roomId) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  const studyTime = 25 * 60;
  const breakTime = 5 * 60;
  const totalTime = room.timerState.mode === 'study' ? studyTime : breakTime;

  room.timerState.timeRemaining = totalTime;
  room.timerState.totalTime = totalTime;
  room.timerState.isRunning = false;
  room.timerState.startedAt = null;
  room.timerState.pausedAt = null;

  io.to(roomId).emit('timer:reset', room.timerState);
}

function transitionTimerMode(roomId) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  if (room.timerState.mode === 'study') {
    room.timerState.mode = 'break';
    room.timerState.timeRemaining = 5 * 60;
    room.timerState.totalTime = 5 * 60;
    room.timerState.sessionCount += 1;
  } else {
    room.timerState.mode = 'study';
    room.timerState.timeRemaining = 25 * 60;
    room.timerState.totalTime = 25 * 60;
  }

  room.timerState.isRunning = true;
  room.timerState.startedAt = new Date().toISOString();
  room.timerState.pausedAt = null;

  io.to(roomId).emit('timer:transitioned', room.timerState);
  
  // Save to database
  db.saveTimerState(roomId, {
    isRunning: room.timerState.isRunning,
    mode: room.timerState.mode,
    timeRemaining: room.timerState.timeRemaining,
    totalTime: room.timerState.totalTime,
    startedAt: room.timerState.startedAt,
    pausedAt: room.timerState.pausedAt,
    sessionCount: room.timerState.sessionCount
  });
}

// ============================================
// REST API ENDPOINTS
// ============================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get all public rooms
app.get('/api/rooms/public', async (req, res) => {
  const result = await db.getPublicRooms();
  
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  const publicRooms = result.rooms.map(room => {
    const activeRoom = activeRooms.get(room.id);
    return {
      id: room.id,
      roomCode: room.room_code,
      roomName: room.room_name,
      isPublic: room.is_public,
      participantCount: activeRoom ? activeRoom.participants.length : 0,
      capacity: room.capacity,
      status: activeRoom ? activeRoom.timerState.mode : 'study',
      createdAt: room.created_at
    };
  });

  res.json(publicRooms);
});

// Create a new room
app.post('/api/rooms', async (req, res) => {
  const { roomName, isPublic = true, capacity = 10 } = req.body;

  if (!roomName || roomName.trim() === '') {
    return res.status(400).json({ error: 'Room name is required' });
  }

  // For private rooms, set requires_approval to true
  const requiresApproval = !isPublic;

  // Generate unique 6-digit room code
  let roomCode;
  let codeExists = true;
  while (codeExists) {
    roomCode = generateRandomRoomCode();
    const existsResult = await db.checkRoomExists(roomCode);
    if (!existsResult.success) {
      return res.status(500).json({ error: 'Database error' });
    }
    codeExists = existsResult.exists;
  }

  // Create room
  const createResult = await db.createRoom(roomCode, roomName, isPublic, capacity, requiresApproval);
  if (!createResult.success) {
    return res.status(500).json({ error: createResult.error });
  }

  // Initialize in-memory cache
  await initializeRoom(createResult.room.id);

  res.status(201).json({
    id: createResult.room.id,
    roomCode: createResult.room.room_code,
    roomName: createResult.room.room_name,
    isPublic: createResult.room.is_public,
    requiresApproval: createResult.room.requires_approval,
    capacity: createResult.room.capacity
  });
});

// Get room by code
app.get('/api/rooms/:roomCode', async (req, res) => {
  const codeResult = await db.getRoomByCode(req.params.roomCode);

  if (!codeResult.success || !codeResult.room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const activeRoom = activeRooms.get(codeResult.room.id);

  res.json({
    id: codeResult.room.id,
    roomCode: codeResult.room.room_code,
    roomName: codeResult.room.room_name,
    isPublic: codeResult.room.is_public,
    participantCount: activeRoom ? activeRoom.participants.length : 0,
    capacity: codeResult.room.capacity,
    status: activeRoom ? activeRoom.timerState.mode : 'study',
    createdAt: codeResult.room.created_at
  });
});

// ============================================
// WEBSOCKET HANDLERS
// ============================================

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joins a room
  socket.on('room:join', async (data) => {
    const { roomCode, username } = data;
    
    // Get room from database
    const roomResult = await db.getRoomByCode(roomCode);
    if (!roomResult.success || !roomResult.room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const roomId = roomResult.room.id;

    // Initialize room if not already in cache
    if (!activeRooms.has(roomId)) {
      await initializeRoom(roomId);
    }

    const room = activeRooms.get(roomId);

    // Check capacity
    if (room.participants.length >= room.capacity) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    // Add participant to database
    const isHost = room.participants.length === 0;
    const participantResult = await db.addParticipant(roomId, socket.id, username, isHost);

    if (!participantResult.success) {
      socket.emit('error', { message: 'Failed to join room' });
      return;
    }

    // Update in-memory cache
    room.participants.push({
      userId: socket.id,
      username: username,
      joinedAt: participantResult.participant.joined_at,
      isHost: isHost
    });

    // Join socket to room
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = socket.id;
    socket.data.username = username;
    socket.data.isHost = isHost;

    // Log activity
    await db.logActivity(roomId, 'user_joined', socket.id, username);

    // Notify all users in room
    io.to(roomId).emit('user:joined', {
      userId: socket.id,
      username: username,
      isHost: isHost,
      participants: room.participants
    });

    // Send current room state to the user
    socket.emit('room:state', getRoomFullState(room));

    console.log(`${username} joined room ${roomCode}`);
  });

  // User requests to join a private room (goes to waiting room)
  socket.on('room:join-request', async (data) => {
    const { roomCode, username } = data;

    // Get room from database
    const roomResult = await db.getRoomByCode(roomCode);
    if (!roomResult.success || !roomResult.room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const roomId = roomResult.room.id;
    const room = roomResult.room;

    // Check if room requires approval
    if (!room.requires_approval) {
      // If public room, just join directly
      socket.emit('room:join-approved', { roomCode });
      return;
    }

    // Create join request in database
    const requestResult = await db.createJoinRequest(roomId, socket.id, username);
    if (!requestResult.success) {
      socket.emit('error', { message: 'Failed to request to join room' });
      return;
    }

    // Store join request info on socket
    socket.data.roomId = roomId;
    socket.data.userId = socket.id;
    socket.data.username = username;
    socket.data.joinRequestId = requestResult.request.id;

    // Join socket to a temporary room for notifications
    socket.join(`room-${roomId}-requests`);

    // Send confirmation to user
    socket.emit('room:join-request-sent', {
      roomCode,
      roomName: room.room_name,
      requestId: requestResult.request.id
    });

    // Notify the host about the new request
    const participantsResult = await db.getParticipants(roomId);
    if (participantsResult.success) {
      participantsResult.participants.forEach(participant => {
        if (participant.is_host) {
          io.to(roomId).emit('request:pending', {
            requestId: requestResult.request.id,
            username,
            userId: socket.id,
            message: `${username} is requesting to join the room`
          });
        }
      });
    }

    console.log(`${username} requested to join private room ${roomCode}`);
  });

  // Host approves a join request
  socket.on('request:approve', async (data) => {
    const { requestId, username, userId, roomCode } = data;

    // Get room from database
    const roomResult = await db.getRoomByCode(roomCode);
    if (!roomResult.success || !roomResult.room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const roomId = roomResult.room.id;

    // Approve the request in database
    const approveResult = await db.approveJoinRequest(requestId, socket.id);
    if (!approveResult.success) {
      socket.emit('error', { message: 'Failed to approve request' });
      return;
    }

    // Notify the requesting user that they're approved
    io.to(`room-${roomId}-requests`).emit('room:join-approved', {
      roomCode,
      userId
    });

    console.log(`Host approved ${username} to join room ${roomCode}`);
  });

  // Host rejects a join request
  socket.on('request:reject', async (data) => {
    const { requestId, username, userId, roomCode } = data;

    // Get room from database
    const roomResult = await db.getRoomByCode(roomCode);
    if (!roomResult.success || !roomResult.room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const roomId = roomResult.room.id;

    // Reject the request in database
    const rejectResult = await db.rejectJoinRequest(requestId);
    if (!rejectResult.success) {
      socket.emit('error', { message: 'Failed to reject request' });
      return;
    }

    // Notify the requesting user that they're rejected
    io.to(`room-${roomId}-requests`).emit('room:join-rejected', {
      roomCode,
      userId,
      message: 'Your request to join this room was rejected'
    });

    console.log(`Host rejected ${username}'s request to join room ${roomCode}`);
  });

  // User leaves a room
  socket.on('disconnect', async () => {
    if (socket.data.roomId) {
      const room = activeRooms.get(socket.data.roomId);
      if (room) {
        const username = socket.data.username;

        // Remove from database
        await db.removeParticipant(socket.data.roomId, socket.id);

        // Update in-memory cache
        room.participants = room.participants.filter(p => p.userId !== socket.id);

        // Log activity
        await db.logActivity(socket.data.roomId, 'user_left', socket.id, username);

        io.to(room.id).emit('user:left', {
          userId: socket.id,
          username: username,
          participants: room.participants
        });

        // Handle host change
        if (socket.data.isHost && room.participants.length > 0) {
          const newHost = room.participants[0];
          await db.setHostStatus(room.id, newHost.userId, true);
          newHost.isHost = true;
          io.to(room.id).emit('host:changed', {
            newHostId: newHost.userId,
            newHostName: newHost.username
          });
        }

        // Clean up empty rooms
        if (room.participants.length === 0) {
          if (timerIntervals.has(room.id)) {
            clearInterval(timerIntervals.get(room.id));
            timerIntervals.delete(room.id);
          }
          activeRooms.delete(room.id);
        }

        console.log(`${username} left room`);
      }
    }

    console.log(`User disconnected: ${socket.id}`);
  });

  // ============ TIMER CONTROLS ============

  socket.on('timer:start', () => {
    if (!socket.data.roomId) return;
    const room = activeRooms.get(socket.data.roomId);
    if (room && socket.data.isHost) {
      startRoomTimer(socket.data.roomId);
    }
  });

  socket.on('timer:pause', () => {
    if (!socket.data.roomId) return;
    const room = activeRooms.get(socket.data.roomId);
    if (room && socket.data.isHost) {
      pauseRoomTimer(socket.data.roomId);
    }
  });

  socket.on('timer:resume', () => {
    if (!socket.data.roomId) return;
    const room = activeRooms.get(socket.data.roomId);
    if (room && socket.data.isHost) {
      resumeRoomTimer(socket.data.roomId);
    }
  });

  socket.on('timer:reset', () => {
    if (!socket.data.roomId) return;
    const room = activeRooms.get(socket.data.roomId);
    if (room && socket.data.isHost) {
      resetRoomTimer(socket.data.roomId);
    }
  });

  // ============ TASK MANAGEMENT ============

  socket.on('task:add', async (data) => {
    if (!socket.data.roomId) return;
    const room = activeRooms.get(socket.data.roomId);
    if (!room) return;

    const taskResult = await db.addTask(socket.data.roomId, data.title, socket.id);
    if (!taskResult.success) return;

    const task = {
      id: taskResult.task.id,
      title: taskResult.task.title,
      completed: taskResult.task.completed,
      createdBy: taskResult.task.created_by,
      createdAt: taskResult.task.created_at
    };

    room.tasks.push(task);

    io.to(room.id).emit('task:added', task);
    await db.logActivity(room.id, 'task_added', socket.id, socket.data.username, { taskTitle: data.title });
  });

  socket.on('task:update', async (data) => {
    if (!socket.data.roomId) return;
    const room = activeRooms.get(socket.data.roomId);
    if (!room) return;

    const updates = {};
    if (data.updates.completed !== undefined) updates.completed = data.updates.completed;
    if (data.updates.title !== undefined) updates.title = data.updates.title;

    const taskResult = await db.updateTask(data.taskId, updates);
    if (!taskResult.success) return;

    const taskIndex = room.tasks.findIndex(t => t.id === data.taskId);
    if (taskIndex !== -1) {
      Object.assign(room.tasks[taskIndex], data.updates);
    }

    io.to(room.id).emit('task:updated', {
      taskId: data.taskId,
      updates: data.updates
    });

    await db.logActivity(room.id, 'task_updated', socket.id, socket.data.username, { taskId: data.taskId });
  });

  socket.on('task:delete', async (data) => {
    if (!socket.data.roomId) return;
    const room = activeRooms.get(socket.data.roomId);
    if (!room) return;

    const deleteResult = await db.deleteTask(data.taskId);
    if (!deleteResult.success) return;

    room.tasks = room.tasks.filter(t => t.id !== data.taskId);

    io.to(room.id).emit('task:deleted', {
      taskId: data.taskId
    });

    await db.logActivity(room.id, 'task_deleted', socket.id, socket.data.username, { taskId: data.taskId });
  });

  // Request full room state
  socket.on('room:requestState', () => {
    if (!socket.data.roomId) return;
    const room = activeRooms.get(socket.data.roomId);
    if (room) {
      socket.emit('room:state', getRoomFullState(room));
    }
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Virtual Café server running on http://localhost:${PORT}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
