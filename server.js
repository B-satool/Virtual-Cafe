// Virtual Cafe Server
require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const db = require("./src/database");
const initSocketHandlers = require("./src/socketHandlers");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE
// ============================================

app.use(express.json({ limit: "50mb" }));
app.use(express.static("public"));

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// ============================================
// AUTH CALLBACK FOR SUPABASE
// ============================================

app.get("/auth/callback", (req, res) => {
  const { access_token, refresh_token } = req.query;
  res.send(`
        <html>
            <script>
                if ('${access_token}') {
                    localStorage.setItem('accessToken', '${access_token}');
                    localStorage.setItem('refreshToken', '${refresh_token}');
                }
                window.location.href = '/';
            </script>
        </html>
    `);
});

// ============================================
// AUTH MIDDLEWARE
// ============================================

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.slice(7);
  const verifyResult = await db.verifyToken(token);
  if (!verifyResult.success) {
    return res.status(401).json({ error: "Invalid token" });
  }
  req.user = verifyResult.user;
  next();
}

// ============================================
// API ROUTES
// ============================================

// Auth
app.post("/api/auth/signup", async (req, res) => {
  const { email, password, username, fullName } = req.body;
  const result = await db.signUp(email, password, username, fullName);
  if (!result.success) return res.status(400).json({ error: result.error });
  res.status(201).json(result);
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body; // email here acts as identifier (email or username)
  const result = await db.logIn(email, password);
  if (!result.success)
    return res.status(401).json({ error: result.error || "Invalid credentials" });
  res.json(result);
});

app.get("/api/auth/verify", verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Rooms
app.get("/api/rooms/public", verifyToken, async (req, res) => {
  const result = await db.getPublicRooms();
  if (!result.success) return res.status(400).json({ error: result.error });

  // Enrich each room with live timer state from in-memory map
  const enriched = (result.result || []).map((room) => {
    const timerState = initSocketHandlers.getRoomTimerState(room.room_code);
    return {
      ...room,
      timer_mode: timerState ? timerState.mode : 'idle',
      timer_running: timerState ? timerState.isRunning : false,
    };
  });

  res.json({ success: true, rooms: enriched });
});

app.post("/api/rooms/join", verifyToken, async (req, res) => {
  const { room_code, user_id } = req.body;
  const result = await db.getRoomByCode(room_code);
  if (!result.success) {
    return res.status(404).json({ error: "Room not found" });
  }
  res.json({ success: true, room: result.result });
});

app.post("/api/rooms/create", verifyToken, async (req, res) => {
  const { roomName, isPublic, capacity } = req.body;
  const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
  const result = await db.createRoom(
    roomName,
    isPublic,
    roomCode,
    capacity || 10,
    req.user.id,
  );
  if (!result.success) return res.status(400).json({ error: result.error });
  res.status(201).json({ success: true, room: result.result });
});

// Sound Preferences
app.get("/api/user/sound-preferences", verifyToken, async (req, res) => {
  const result = await db.getSoundPreferences(req.user.id);
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.put("/api/user/sound-preferences", verifyToken, async (req, res) => {
  const { sound_preferences, volume_settings } = req.body;
  if (!sound_preferences || !volume_settings) {
    return res
      .status(400)
      .json({ error: "sound_preferences and volume_settings are required" });
  }
  const result = await db.saveSoundPreferences(
    req.user.id,
    sound_preferences,
    volume_settings,
  );
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result);
});

// User Profile & Dashboard
app.get("/api/user-profile", verifyToken, async (req, res) => {
  const result = await db.getUserProfile(req.user.id);
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.get("/api/session-logs", verifyToken, async (req, res) => {
  const limit = req.query.limit || 50;
  const result = await db.getUserSessionLogs(req.user.id, limit);
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.post("/api/update-profile", verifyToken, async (req, res) => {
  const { display_name, username, profile_picture_url } = req.body;
  const updates = {};

  if (display_name !== undefined) {
    if (!display_name || !display_name.trim()) {
      return res.status(400).json({ error: "display_name cannot be empty" });
    }
    updates.display_name = display_name.trim();
  }

  if (username !== undefined) {
    if (!username || !username.trim()) {
      return res.status(400).json({ error: "username cannot be empty" });
    }
    updates.username = username.trim();
  }

  if (profile_picture_url !== undefined && profile_picture_url) {
    updates.profile_picture_url = profile_picture_url;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const result = await db.updateUserProfile(req.user.id, updates);
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result);
});

// Initialize Sockets
initSocketHandlers(io);

// Dynamic port selection
function startServer(port) {
  server
    .listen(port, () => {
      console.log(`[PORT] Virtual Café server running on port ${port}`);
      console.log(`[PORT] Open http://localhost:${port} in your browser`);
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.log(`[PORT] Port ${port} is busy, trying ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error("[PORT_ERROR]", err);
      }
    });
}

startServer(PORT);
