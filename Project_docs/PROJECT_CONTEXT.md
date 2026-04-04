# Virtual Café - Project Context

## 📋 PROJECT OVERVIEW

**Virtual Café** is a real-time collaborative study platform that enables users to join shared study rooms with synchronized Pomodoro timers, task management, and ambient soundscapes. The application fosters focused, group-based studying with features for presence tracking, host-controlled timers, and shared task lists.

**Core Value Proposition**: Study together, stay synchronized, focus better.

---

## 🛠️ TECHNOLOGY STACK

### **Frontend**
- **Framework**: React 18+ (with Hooks)
- **State Management**: Context API + useReducer
- **Real-time Communication**: Socket.io Client
- **Styling**: CSS3 (custom) / Tailwind CSS (recommended)
- **HTTP Client**: Fetch API
- **Build Tool**: Vite (recommended) or Create React App
- **Package Manager**: npm

### **Backend**
- **Runtime**: Node.js (v24.11.1)
- **Web Framework**: Express.js (v4.18.2)
- **Real-time Engine**: Socket.io (v4.5.4)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Environment Management**: dotenv

### **Database**
- **Primary**: Supabase PostgreSQL
- **Tables**: 8 tables (user_profiles, rooms, participants, tasks, timer_states, join_requests, room_activity_log, user_settings)
- **Security**: Row Level Security (RLS) enabled
- **ORM**: Direct Supabase client (supabase-js)

### **Deployment & DevOps**
- **Backend Port**: 3001
- **Frontend Port**: 3000 (typical React dev server)
- **Git**: Version control with main branch

---

## ✨ KEY FEATURES

### **1. Authentication & User Management**
- User signup with email and password
- User login with persistent sessions
- JWT-based session management (stored in localStorage)
- User profile with email and full name
- Logout functionality with session cleanup

### **2. Room Management**
- **Create Rooms**: Public or private with configurable capacity
- **Unique Room Codes**: 6-digit alphanumeric codes
- **Join/Leave**: Real-time room entry and exit
- **Room Metadata**: Name, host, capacity, current participants, status
- **Capacity Enforcement**: Prevent overcrowding
- **Private Room Workflow**: Optional approval-based joining

### **3. Real-time Presence Tracking**
- Instant participant list updates
- Online/offline status (in-room)
- Host status indicators
- Auto-reassignment of host on host disconnect

### **4. Synchronized Pomodoro Timer**
- **Controls**: Start, Pause, Resume, Reset (host-only)
- **Modes**: Study (25 min) and Break (5 min)
- **Auto-Transition**: Automatic switch between modes
- **Real-time Sync**: All participants see identical timer state
- **Grace Period**: 5-second disconnect tolerance before removal
- **Persistence**: In-memory state + recovery on refresh

### **5. In-Room Collaboration**
- **Shared Task List**: Add, edit, delete, mark complete
- **Task Ownership**: Track who created each task
- **Real-time Sync**: Instant updates across all participants
- **Task Persistence**: Tasks persist in database per room

### **6. Ambient Soundscapes**
- **Available Sounds**: Rain, Café chatter, Fireplace
- **Volume Control**: Per-sound volume adjustment
- **Toggle**: Turn sounds on/off individually
- **Frontend Support**: Playback controls in UI

### **7. Room Host Controls**
- **Host Designation**: Auto-assigned (creator or first participant)
- **Host Reassignment**: Auto-assigns to next participant if host leaves
- **Timer Control**: Only host can control timer
- **Participant Management**: Host can remove users (feature in development)
- **Room Closure**: Room deletes when all participants leave

### **8. Dashboard & Navigation**
- **Landing Page**: Shows public rooms and create/join options
- **Room Selection**: List of available public rooms to join
- **Room Creation**: Form to create new rooms
- **Active Room**: Full collaboration interface
- **User Display**: Current logged-in user with logout button

### **9. Error Handling & Validation**
- Input sanitization (XSS prevention)
- Email format validation
- Password strength enforcement (8+ chars, uppercase, lowercase, numbers)
- Room capacity validation
- Authorization checks (users can only access their own data)
- Graceful error messages
- Automatic session cleanup on disconnect

---

## 📊 REQUIREMENT STATUS

### **✅ FULLY IMPLEMENTED (13 requirements)**

#### Authentication & User Management (5/5)
- ✅ User registration and login
- ✅ Persistent user sessions (JWT/localStorage)
- ✅ Basic user profile (name, email)
- ✅ User presence tracking (in-room status)
- ✅ Logout functionality

#### Study Room Management (8/8)
- ✅ Public and private room creation
- ✅ Unique 6-digit room codes
- ✅ Seamless join/leave
- ✅ Room metadata (name, host, capacity, participants)
- ✅ Real-time presence tracking
- ✅ Room capacity limits
- ✅ Invalid room code handling
- ✅ Host management + auto-reassignment

#### Synchronized Pomodoro (7/7)
- ✅ Host-controlled timer (start, pause, resume, reset)
- ✅ Real-time sync across participants
- ✅ Study/Break mode transitions (25/5 min)
- ✅ Correct timer state on mid-session join
- ✅ Timer persistence across refresh
- ✅ Host disconnect handling with grace period
- ✅ Automatic mode transitions

#### In-Room Collaboration (3/3)
- ✅ Shared task list (add, edit, delete)
- ✅ Real-time task sync
- ✅ Task ownership tracking

#### Ambient Features (2/2)
- ✅ Backend sound options support
- ✅ Frontend toggle/volume controls

#### Dashboard & Navigation (4/4)
- ✅ Landing page with available rooms
- ✅ Create/join options
- ✅ Clear navigation flow
- ✅ User display + logout

#### System-Level Features (4/4)
- ✅ WebSocket (Socket.io) for real-time
- ✅ Modular backend structure
- ✅ Data validation & error handling
- ✅ Authorization checks

---

### **❌ NOT IMPLEMENTED (8 requirements)**

#### Communication & Interaction (1/2)
- ❌ **In-room chat system** - No text messaging
- ❌ Event notifications (partially: basic notifications exist, but not comprehensive)

#### Host Controls (2/3)
- ❌ **Remove users feature** - Host cannot kick participants
- ❌ **Transfer host feature** (UI) - Only auto-reassignment exists, no voluntary transfer

#### Pomodoro System (1/7)
- ❌ **Configurable timer durations** - Hardcoded to 25/5 minutes, no custom settings

#### Ambient Features (1/2)
- ❌ **Sound preference persistence** - Settings not saved to database

#### Optional Enhancements (3/?)
- ❌ **Task tagging/categorization** - Basic list only
- ❌ **Room activity logging** - Table exists, no functional logging
- ❌ **Global online/offline status** - Only in-room presence tracked

---

## 🏗️ PROJECT STRUCTURE

```
Virtual Cafe/
├── backend/
│   ├── server.js                 # Express + Socket.io server
│   ├── src/
│   │   ├── database.js          # Supabase abstraction layer
│   │   └── socketHandlers.js    # Real-time socket events
│   ├── .env                     # Environment variables
│   ├── package.json
│   └── schema.sql               # Database schema
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── css/style.css
│   │   ├── js/
│   │   │   ├── main.js
│   │   │   └── modules/         # Modular JS functions
│   │   └── assets/
│   └── package.json
│
└── PROJECT_CONTEXT.md           # This file
```

---

## 🔄 CURRENT ARCHITECTURE

### Frontend (Before React)
- Vanilla JavaScript with modular functions
- Static HTML with class-based page visibility
- Manual DOM manipulation
- Client-side socket event handlers

### Backend
- Express HTTP API for auth and room management
- Socket.io for real-time events
- Supabase for persistence
- In-memory state for room timers and hosts

### Communication Flow
```
Client (Browser)
    ↓ REST API (auth, room creation)
Server (Express)
    ↓ Socket.io (real-time sync)
Client + Server
    ↓ Database operations
Supabase (PostgreSQL)
```

---

## 🎯 NEXT MILESTONES (ignore this section)

### Milestone 4: Complete Missing Features
1. **In-room chat system** (high priority)
2. **Remove users feature** (host control)
3. **Configurable timer durations** (UX improvement)
4. **Transfer host UI** (host control)
5. **Sound preference persistence** (UX polish)

### Milestone 5: React Refactor
- Migrate frontend to React
- Implement Context API for state management
- Create reusable component library
- Improve code maintainability

### Milestone 6: Polish & Deployment
- User experience improvements
- Performance optimization
- Production deployment
- Documentation

---

## 📈 METRICS & MONITORING

### Tracked Events
- User authentication (success/failure)
- Room creation/deletion
- Participant join/leave
- Timer state changes
- Task updates
- Errors and edge cases

### Performance Considerations
- Real-time sync critical path
- WebSocket connection stability
- Database query optimization
- Frontend render optimization (React)

---

## 🔐 SECURITY FEATURES

- Input sanitization (XSS prevention)
- Strong password requirements
- JWT-based authentication
- Authorization middleware
- CORS configuration
- Security headers (X-Content-Type-Options, X-Frame-Options, HSTS)
- Row-Level Security (RLS) in database

---

## 📝 NOTES

- Project uses Supabase for both auth and database
- Email confirmation currently optional (can be enforced)
- All real-time features use Socket.io
- Timer based on server-authoritative state for sync
- Room state persists per browser session via localStorage

---

**Last Updated**: April 4, 2026
**Status**: Milestone 3 - 80% Complete (13/21 requirements fulfilled)
