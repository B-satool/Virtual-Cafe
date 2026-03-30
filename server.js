const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

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
// DATA STRUCTURES
// ============================================

// Store all rooms and their state
const rooms = new Map();

// Timer intervals for each room
const timerIntervals = new Map();

// ============================================
// ROOM CLASS
// ============================================

class StudyRoom {
  constructor(roomCode, isPublic = true, capacity = 10) {
    this.id = uuidv4();
    this.roomCode = roomCode;
    this.isPublic = isPublic;
    this.capacity = capacity;
    this.participants = new Map(); // userId -> {username, joinedAt, isHost}
    this.tasks = []; // Array of task objects
    this.timerState = {
      isRunning: false,
      mode: 'study', // 'study' or 'break'
      timeRemaining: 25 * 60, // Start with 25 minutes in seconds
      totalTime: 25 * 60,
      startedAt: null,
      pausedAt: null,
      sessionCount: 0
    };
    this.createdAt = new Date();
    this.lastActivityAt = new Date();
  }

  addParticipant(userId, username, isHost = false) {
    this.participants.set(userId, {
      username,
      joinedAt: new Date(),
      isHost
    });
    this.lastActivityAt = new Date();
  }

  removeParticipant(userId) {
    this.participants.delete(userId);
    this.lastActivityAt = new Date();
    
    // If host left, assign new host if participants exist
    if (this.participants.size > 0) {
      const currentHost = Array.from(this.participants.entries()).find(([_, p]) => p.isHost);
      if (!currentHost) {
        const firstParticipant = this.participants.entries().next();
        if (!firstParticipant.done) {
          firstParticipant.value[1].isHost = true;
        }
      }
    }
  }

  addTask(taskId, title, userId) {
    this.tasks.push({
      id: taskId,
      title,
      completed: false,
      createdBy: userId,
      createdAt: new Date()
    });
    this.lastActivityAt = new Date();
  }

  updateTask(taskId, updates) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      Object.assign(task, updates);
      this.lastActivityAt = new Date();
    }
  }

  deleteTask(taskId) {
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    this.lastActivityAt = new Date();
  }

  getPublicInfo() {
    return {
      id: this.id,
      roomCode: this.roomCode,
      isPublic: this.isPublic,
      participantCount: this.participants.size,
      capacity: this.capacity,
      status: this.timerState.mode,
      createdAt: this.createdAt
    };
  }

  getFullState() {
    return {
      id: this.id,
      roomCode: this.roomCode,
      isPublic: this.isPublic,
      capacity: this.capacity,
      participants: Array.from(this.participants.entries()).map(([userId, info]) => ({
        userId,
        ...info
      })),
      tasks: this.tasks,
      timerState: this.timerState,
      participantCount: this.participants.size
    };
  }
}

// ============================================
// TIMER MANAGEMENT
// ============================================

function startRoomTimer(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.timerState.isRunning = true;
  room.timerState.startedAt = Date.now();
  room.timerState.pausedAt = null;

  // Notify all participants
  io.to(roomId).emit('timer:started', room.timerState);

  // Clear existing interval if any
  if (timerIntervals.has(roomId)) {
    clearInterval(timerIntervals.get(roomId));
  }

  // Set up timer interval (update every second)
  const interval = setInterval(() => {
    const room = rooms.get(roomId);
    if (!room) {
      clearInterval(interval);
      timerIntervals.delete(roomId);
      return;
    }

    if (room.timerState.isRunning && room.timerState.timeRemaining > 0) {
      room.timerState.timeRemaining -= 1;
      io.to(roomId).emit('timer:tick', room.timerState);

      // Timer finished
      if (room.timerState.timeRemaining === 0) {
        transitionTimerMode(roomId);
      }
    }
  }, 1000);

  timerIntervals.set(roomId, interval);
}

function pauseRoomTimer(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.timerState.isRunning = false;
  room.timerState.pausedAt = Date.now();

  io.to(roomId).emit('timer:paused', room.timerState);
}

function resumeRoomTimer(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.timerState.isRunning = true;
  room.timerState.startedAt = Date.now() - (room.timerState.totalTime - room.timerState.timeRemaining) * 1000;
  room.timerState.pausedAt = null;

  io.to(roomId).emit('timer:resumed', room.timerState);
}

function resetRoomTimer(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  // Set time based on mode
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
  const room = rooms.get(roomId);
  if (!room) return;

  // Switch mode
  if (room.timerState.mode === 'study') {
    room.timerState.mode = 'break';
    room.timerState.timeRemaining = 5 * 60; // 5 minute break
    room.timerState.totalTime = 5 * 60;
    room.timerState.sessionCount += 1;
  } else {
    room.timerState.mode = 'study';
    room.timerState.timeRemaining = 25 * 60; // 25 minute study
    room.timerState.totalTime = 25 * 60;
  }

  room.timerState.isRunning = true;
  room.timerState.startedAt = Date.now();
  room.timerState.pausedAt = null;

  // Notify all participants
  io.to(roomId).emit('timer:transitioned', room.timerState);
}

// ============================================
// REST API ENDPOINTS
// ============================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get all public rooms
app.get('/api/rooms/public', (req, res) => {
  const publicRooms = Array.from(rooms.values())
    .filter(room => room.isPublic)
    .map(room => room.getPublicInfo());
  res.json(publicRooms);
});

// Create a new room
app.post('/api/rooms', (req, res) => {
  const { roomCode, isPublic = true, capacity = 10 } = req.body;

  // Check if room code already exists
  if (Array.from(rooms.values()).some(r => r.roomCode === roomCode)) {
    return res.status(400).json({ error: 'Room code already exists' });
  }

  const room = new StudyRoom(roomCode, isPublic, capacity);
  rooms.set(room.id, room);

  res.status(201).json({
    id: room.id,
    roomCode: room.roomCode,
    isPublic: room.isPublic,
    capacity: room.capacity
  });
});

// Get room by code
app.get('/api/rooms/:roomCode', (req, res) => {
  const room = Array.from(rooms.values()).find(r => r.roomCode === req.params.roomCode);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json(room.getPublicInfo());
});

// ============================================
// WEBSOCKET HANDLERS
// ============================================

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joins a room
  socket.on('room:join', (data) => {
    const { roomCode, username } = data;
    const room = Array.from(rooms.values()).find(r => r.roomCode === roomCode);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.participants.size >= room.capacity) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    // Add user to room
    const isHost = room.participants.size === 0; // First participant is host
    room.addParticipant(socket.id, username, isHost);

    // Join socket to room
    socket.join(room.id);
    socket.data.roomId = room.id;
    socket.data.userId = socket.id;
    socket.data.username = username;

    // Notify all users in room
    io.to(room.id).emit('user:joined', {
      userId: socket.id,
      username,
      isHost,
      participants: Array.from(room.participants.entries()).map(([userId, info]) => ({
        userId,
        ...info
      }))
    });

    // Send current room state to the user
    socket.emit('room:state', room.getFullState());

    console.log(`${username} joined room ${roomCode}`);
  });

  // User leaves a room
  socket.on('disconnect', () => {
    if (socket.data.roomId) {
      const room = rooms.get(socket.data.roomId);
      if (room) {
        const username = socket.data.username;
        room.removeParticipant(socket.id);

        io.to(room.id).emit('user:left', {
          userId: socket.id,
          username,
          participants: Array.from(room.participants.entries()).map(([userId, info]) => ({
            userId,
            ...info
          }))
        });

        // Clean up empty rooms
        if (room.participants.size === 0) {
          if (timerIntervals.has(room.id)) {
            clearInterval(timerIntervals.get(room.id));
            timerIntervals.delete(room.id);
          }
          rooms.delete(room.id);
        }

        console.log(`${username} left room`);
      }
    }

    console.log(`User disconnected: ${socket.id}`);
  });

  // ============ TIMER CONTROLS ============

  socket.on('timer:start', () => {
    if (!socket.data.roomId) return;
    const room = rooms.get(socket.data.roomId);
    if (room && room.participants.get(socket.id)?.isHost) {
      startRoomTimer(socket.data.roomId);
    }
  });

  socket.on('timer:pause', () => {
    if (!socket.data.roomId) return;
    const room = rooms.get(socket.data.roomId);
    if (room && room.participants.get(socket.id)?.isHost) {
      pauseRoomTimer(socket.data.roomId);
    }
  });

  socket.on('timer:resume', () => {
    if (!socket.data.roomId) return;
    const room = rooms.get(socket.data.roomId);
    if (room && room.participants.get(socket.id)?.isHost) {
      resumeRoomTimer(socket.data.roomId);
    }
  });

  socket.on('timer:reset', () => {
    if (!socket.data.roomId) return;
    const room = rooms.get(socket.data.roomId);
    if (room && room.participants.get(socket.id)?.isHost) {
      resetRoomTimer(socket.data.roomId);
    }
  });

  // ============ TASK MANAGEMENT ============

  socket.on('task:add', (data) => {
    if (!socket.data.roomId) return;
    const room = rooms.get(socket.data.roomId);
    if (!room) return;

    const taskId = uuidv4();
    room.addTask(taskId, data.title, socket.id);

    io.to(room.id).emit('task:added', {
      id: taskId,
      title: data.title,
      completed: false,
      createdBy: socket.id,
      createdAt: new Date()
    });
  });

  socket.on('task:update', (data) => {
    if (!socket.data.roomId) return;
    const room = rooms.get(socket.data.roomId);
    if (!room) return;

    room.updateTask(data.taskId, data.updates);
    io.to(room.id).emit('task:updated', {
      taskId: data.taskId,
      updates: data.updates
    });
  });

  socket.on('task:delete', (data) => {
    if (!socket.data.roomId) return;
    const room = rooms.get(socket.data.roomId);
    if (!room) return;

    room.deleteTask(data.taskId);
    io.to(room.id).emit('task:deleted', {
      taskId: data.taskId
    });
  });

  // Request full room state
  socket.on('room:requestState', () => {
    if (!socket.data.roomId) return;
    const room = rooms.get(socket.data.roomId);
    if (room) {
      socket.emit('room:state', room.getFullState());
    }
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Virtual Café server running on http://localhost:${PORT}`);
});
