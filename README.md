# Virtual Café - Study Room Application

## 📚 Project Overview

Virtual Café is a web-based platform that recreates the experience of studying in a café by allowing users to join shared or private study rooms, participate in synchronized Pomodoro sessions, manage shared task lists, and enjoy ambient background sounds—all without needing physical meetups.

The application is designed for students and professionals seeking collaborative study spaces with focus-enhancing features.

---

## ✨ Core Features

### 1. **Public & Private Study Rooms**
- Browse available public study rooms
- Create private rooms with invite codes
- View room capacity and current participants
- Join, create, and leave rooms seamlessly

### 2. **Synchronized Pomodoro Timer**
- Shared timer synchronized across all participants
- Automatic transitions between study (25 min) and break (5 min) sessions
- Host controls: start, pause, resume, and reset
- Real-time countdown visible to all participants
- Handles mid-session joins and page refreshes with timer state recovery

### 3. **Shared Task List per Room**
- Real-time collaborative task board
- Add, edit, complete, and delete tasks
- Tasks visible to all room members
- Persistent task state during session

### 4. **Ambient Background Sounds**
- Built-in ambient sounds:
  - ☔ Rain
  - ☕ Café Chatter
  - 🔥 Fireplace
- Local volume control (doesn't affect other participants)
- Enable/disable sounds without affecting room logic

### 5. **Room Status & Presence Indicators**
- Real-time participant list with avatars
- Visual study/break mode indicators
- Join/leave notifications
- Session counter
- Host identification

---

## 🏗️ Project Architecture

### Technology Stack

**Backend:**
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Socket.IO** - Real-time WebSocket communication
- **UUID** - Unique identifier generation
- **CORS** - Cross-Origin Resource Sharing

**Frontend:**
- **HTML5** - Markup
- **CSS3** - Styling with responsive design
- **Vanilla JavaScript** - Client-side logic
- **Socket.IO Client** - Real-time communication

**Data Storage:**
- In-memory Map-based storage (suitable for sessions)
- Can be extended to use MongoDB, PostgreSQL, or Firebase

### Folder Structure

```
Virtual Cafe/
├── server.js                 # Main backend server
├── package.json             # Dependencies and scripts
├── README.md               # This file
├── WBAD Project Proposal.md # Project specification
├── workflow.txt            # Workflow documentation
├── public/                 # Frontend assets
│   ├── index.html         # Main application file
│   └── assets/            # Images, sounds (future)
└── src/                   # Source code (future expansion)
    ├── routes/            # API routes
    ├── controllers/       # Business logic
    └── models/           # Data models
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)
- A modern web browser

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd "Virtual Cafe"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

   The application will be available at `http://localhost:3000`

### Development

Watch for changes and restart (requires nodemon):
```bash
npm install --save-dev nodemon
npm run dev
```

---

## 📖 How to Use

### Creating a Study Room

1. Fill in your name and desired room code
2. Select room type (public or private)
3. Set room capacity (default: 10 users)
4. Click "Create Room"
5. You'll automatically join as the **Room Host**

### Joining an Existing Room

1. View available public rooms by clicking "Refresh Available Rooms"
2. Click on a room to join it
3. Enter your name and confirm

### Using the Pomodoro Timer

**As a Room Host:**
- Click **Start** to begin the timer
- Click **Pause** to temporarily stop
- Click **Resume** to continue
- Click **Reset** to start over
- Timer automatically transitions: Study → Break → Study (repeats)

**As a Participant:**
- View the shared timer
- All participants see the same countdown
- If the host leaves, the next participant becomes the new host

### Managing Tasks

1. Type a task in the "📋 Shared Tasks" input field
2. Click **Add** or press Enter
3. Check the checkbox to mark tasks as complete
4. Click **Delete** to remove a task
5. Changes appear instantly for all participants

### Ambient Sounds

1. Check the box for a sound in the "🎵 Ambient Sounds" panel
2. Adjust the volume slider (0-100%)
3. Your sound choices are private—other participants won't hear them
4. Multiple sounds can play simultaneously

---

## 🔌 API Endpoints

### REST Endpoints

**GET `/`**
- Serves the main application page

**GET `/api/rooms/public`**
- Returns list of all public rooms
- Response: `[{id, roomCode, isPublic, participantCount, capacity, status, createdAt}]`

**GET `/api/rooms/:roomCode`**
- Get details of a specific room
- Response: `{id, roomCode, isPublic, participantCount, capacity, status}`

**POST `/api/rooms`**
- Create a new room
- Body: `{roomCode, isPublic, capacity}`
- Response: `{id, roomCode, isPublic, capacity}`

### WebSocket Events

**Client → Server**

| Event | Data | Description |
|-------|------|-------------|
| `room:join` | `{roomCode, username}` | Join a room |
| `timer:start` | - | Start the timer (host only) |
| `timer:pause` | - | Pause the timer (host only) |
| `timer:resume` | - | Resume the timer (host only) |
| `timer:reset` | - | Reset the timer (host only) |
| `task:add` | `{title}` | Add a task |
| `task:update` | `{taskId, updates}` | Update a task |
| `task:delete` | `{taskId}` | Delete a task |
| `room:requestState` | - | Request full room state |

**Server → Client**

| Event | Data | Description |
|-------|------|-------------|
| `user:joined` | `{userId, username, isHost, participants}` | User joined room |
| `user:left` | `{userId, username, participants}` | User left room |
| `room:state` | Full room object | Complete room state |
| `timer:started` | Timer state | Timer started |
| `timer:paused` | Timer state | Timer paused |
| `timer:resumed` | Timer state | Timer resumed |
| `timer:reset` | Timer state | Timer reset |
| `timer:tick` | Timer state | Timer updated (every second) |
| `timer:transitioned` | Timer state | Mode changed (study→break) |
| `task:added` | Task object | Task added |
| `task:updated` | `{taskId, updates}` | Task updated |
| `task:deleted` | `{taskId}` | Task deleted |
| `error` | `{message}` | Error occurred |

---

## 🔄 Workflow Implementation

### Workflow 1: User Joining or Creating a Study Room
✅ **Implemented**
- Users can view available public rooms
- Users can create private rooms with codes
- Real-time presence updates
- Validation of room codes

### Workflow 2: Synchronized Pomodoro Study Session
✅ **Implemented**
- Host starts/controls timer
- Real-time synchronization across participants
- Automatic mode transitions
- Mid-session join handling (timer syncs new users)
- Page refresh recovery
- Host replacement when host leaves

### Workflow 3: In-Room Collaboration and Focus Environment
✅ **Implemented**
- Shared task list with real-time updates
- Add, edit, delete, complete tasks
- Ambient sound controls (local)
- Visual room status indicators
- Minimal, distraction-free UI

---

## 🎨 UI/UX Design

- **Color Palette**: Warm coffee/café theme (browns, tans, warm whites)
- **Typography**: Clean, readable sans-serif for focus
- **Layout**: Minimal animations, clear hierarchy
- **Responsive**: Works on desktop, tablet, and mobile
- **Accessibility**: Semantic HTML, keyboard shortcuts

### Key UI Elements

- **Timer Display**: Large, centered, easy to read
- **Room Header**: Information hierarchy (code, participants, session count)
- **Task Panel**: Full-width on desktop, stacked on mobile
- **Participants Panel**: Avatar-based with host indicator
- **Ambient Controls**: Fixed panel accessible at all times

---

## 🔐 Security Considerations (Future Enhancements)

- Room code validation
- Password protection for private rooms
- User authentication
- Input sanitization (currently done with `escapeHtml`)
- Rate limiting on API endpoints
- WebSocket connection authentication

---

## 🐛 Known Limitations & Future Enhancements

### Current Limitations
- In-memory storage (data lost on server restart)
- No user authentication
- Single-server deployment (no clustering)
- No audio files (sounds are placeholder notifications)

### Future Enhancements
1. **Database Integration**
   - MongoDB or PostgreSQL for persistent storage
   - User profiles and history

2. **Authentication**
   - Google/GitHub OAuth
   - Email verification

3. **Real Audio**
   - Actual ambient sound files
   - Preloader and streaming

4. **Advanced Features**
   - Task categories and priorities
   - Session statistics and analytics
   - User profiles and preferences
   - Notifications and reminders

5. **Deployment**
   - Docker containerization
   - Cloud hosting (AWS, Heroku, etc.)
   - CDN for static assets

6. **Mobile App**
   - React Native or Flutter
   - Native sound integration

---

## 📊 Room State Structure

```javascript
{
  id: "uuid",
  roomCode: "study-group-01",
  isPublic: true,
  capacity: 10,
  participants: [
    {
      userId: "socket-id",
      username: "John",
      joinedAt: Date,
      isHost: true
    }
  ],
  tasks: [
    {
      id: "uuid",
      title: "Complete assignment",
      completed: false,
      createdBy: "socket-id",
      createdAt: Date
    }
  ],
  timerState: {
    isRunning: false,
    mode: "study", // or "break"
    timeRemaining: 1500, // seconds
    totalTime: 1500,
    startedAt: Date,
    pausedAt: null,
    sessionCount: 0
  },
  createdAt: Date,
  lastActivityAt: Date
}
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Create multiple rooms with different settings
- [ ] Join rooms with multiple browsers/devices
- [ ] Test timer functionality (start, pause, resume, reset)
- [ ] Add, update, complete, delete tasks
- [ ] Refresh page mid-session (timer syncs)
- [ ] Host leaves and participant becomes new host
- [ ] Test ambient sound toggles and volume controls
- [ ] Test responsive design on mobile/tablet
- [ ] Test error handling (duplicate room codes, full rooms)

---

## 📝 License

MIT License - Feel free to use this project for educational and commercial purposes.

---

## 👥 Team

**WBAD Project Team**
- Fatima - Workflow 1: Room Navigation
- Sumaiya - Workflow 2: Pomodoro Timer
- Ammar - Workflow 3: Collaboration & Sounds

---

## 📞 Support & Feedback

For issues, feature requests, or feedback, please reach out to the project team.

---

## 🎯 Milestone 3 Completion

This implementation fulfills all requirements outlined in the Milestone 3 specification:

✅ Full-stack web application
✅ Real-time WebSocket communication
✅ Room management system
✅ Synchronized Pomodoro timer
✅ Shared task list
✅ Presence indicators
✅ Ambient sound controls
✅ Responsive UI/UX
✅ Error handling and edge cases
✅ Complete documentation

**Status**: READY FOR DEPLOYMENT

---

**Last Updated**: March 30, 2026
