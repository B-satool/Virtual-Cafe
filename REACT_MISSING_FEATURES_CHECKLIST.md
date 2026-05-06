# REACT FRONTEND - MISSING FEATURES QUICK REFERENCE

## CRITICAL GAPS (Must Fix for MVP)

### 1. DASHBOARD PAGE - ENTIRELY MISSING ❌
**File that should exist:** `frontend/src/pages/DashboardPage.jsx`

**Required Functions:**
```javascript
// User Profile
- GET /api/user-profile → Display name, username, email, profile picture
- GET /api/profiles/{userId} → Full profile data
- PUT /api/profiles/{userId} → Save edited profile
- POST /api/upload-profile-picture → Upload picture

// Session Logs
- GET /api/session-logs → Load all user sessions
- filterSessions() → Filter by room code/name
- calculateSessionStats() → Total sessions, total hours

// UI Components
- Profile card with avatar
- Edit profile modal
- Session history list
- Statistics display
```

**API Endpoints NOT called from React:**
- `/api/user-profile` (loaded in vanilla but not in React)
- `/api/session-logs` (loaded in vanilla but not in React)
- `/api/profiles/{userId}` (for profile updates)

---

### 2. CHAT SYSTEM - NOT INTEGRATED IN RoomPage ❌

**Missing from RoomPage.jsx:**
```jsx
// Missing JSX:
<div className="chat-section">
  <div className="chat-messages" id="chatMessages">
    {/* Render messages here */}
  </div>
  <form onSubmit={handleSendChat}>
    <input value={chatInput} onChange={...} placeholder="Message..." />
    <button>Send</button>
  </form>
</div>

// Missing State:
const [chatMessages, setChatMessages] = useState([]);
const [chatInput, setChatInput] = useState("");

// Missing Socket Events:
socket.on("chat:message", (data) => {
  setChatMessages(prev => [...prev, data]);
});

// Missing Socket Emit:
socket.emit("chat:message", {
  roomCode: currentRoom.room_code,
  userId: currentUser.id,
  username: currentUser.username,
  message: chatInput,
  timestamp: new Date().toISOString()
});

// Missing Functions:
- loadChatHistory() → Fetch historical messages
- displayChatMessage() → Format and render message
- clearChat() → Clear when leaving room
```

**Files that need updates:**
- `frontend/src/pages/RoomPage.jsx` - Add chat UI and handlers
- `frontend/src/hooks/useSocket.js` - Add chat event listeners

---

### 3. JOIN REQUEST WORKFLOW - MISSING ❌
**File that should exist:** `frontend/src/pages/WaitingRoomPage.jsx`

**Missing Components:**
```jsx
// WaitingRoomPage.jsx:
- Waiting room spinner/loader
- Message: "Requesting Access..."
- Subtitle: "The room host needs to approve your join request."
- Cancel Request button

// Missing Socket Events:
socket.on("join-request:status", (data) => {
  if (data.approved) joinRoom();
  if (data.rejected) showError("Request denied");
});

socket.emit("join-request:cancel", { requestId });

// Missing Host Interface:
- Pending requests panel in RoomPage
- Approve button for each request
- Reject button for each request
- Pending request count indicator
```

**Missing API Endpoints Called:**
- `POST /api/join-requests` - Create request
- `GET /api/rooms/{roomId}/join-requests` - Host view pending
- `POST /api/join-requests/{requestId}/approve` - Approve request
- `POST /api/join-requests/{requestId}/reject` - Reject request

---

## HIGH-PRIORITY GAPS (Core Features)

### 4. TIMER SETTINGS MODAL ❌
**Currently:** Referenced in RoomPage but modal doesn't exist

**Missing Component:**
```jsx
// Timer Settings Modal (to add to RoomPage):
<div className="modal-overlay" style={{display: showTimerSettings ? 'flex' : 'none'}}>
  <div className="modal-content">
    <h2>Timer Settings</h2>
    <div className="form-group">
      <label>Study Duration (minutes)</label>
      <input type="number" value={studyDuration} onChange={...} min="1" max="120" />
    </div>
    <div className="form-group">
      <label>Break Duration (minutes)</label>
      <input type="number" value={breakDuration} onChange={...} min="1" max="60" />
    </div>
    <div className="form-group">
      <label>
        <input type="checkbox" checked={enableSound} onChange={...} />
        Enable Audio Notification
      </label>
    </div>
    <button onClick={saveTimerSettings}>Save</button>
    <button onClick={() => setShowTimerSettings(false)}>Cancel</button>
  </div>
</div>

// State needed:
const [showTimerSettings, setShowTimerSettings] = useState(false);
const [studyDuration, setStudyDuration] = useState(25);
const [breakDuration, setBreakDuration] = useState(5);
const [enableSound, setEnableSound] = useState(true);

// Socket emit on save:
socket.emit("timer:configure", {
  roomCode: currentRoom.room_code,
  studyDuration: studyDuration * 60,
  breakDuration: breakDuration * 60
});
```

---

### 5. AMBIENT SOUNDS - NOT FUNCTIONAL ❌
**Status:** Buttons exist but no implementation

**Missing:**
```javascript
// Web Audio API for sound generation:
import { createRainSound, createCafeSound, createFireplaceSound } from './soundGenerators';

// State:
const [ambientSound, setAmbientSound] = useState("none");
const [soundVolume, setSoundVolume] = useState(50);
const audioContextRef = useRef(null);
const activeSoundsRef = useRef({});

// Handlers:
const handleSoundChange = (sound) => {
  if (sound === "none") {
    stopAllSounds();
  } else {
    startSound(sound);
  }
  setAmbientSound(sound);
  localStorage.setItem("ambientSound", sound);
};

const handleVolumeChange = (volume) => {
  setSoundVolume(volume);
  updateSoundVolume(volume);
  localStorage.setItem("soundVolume", volume);
};

// Missing Web Audio API integration:
- createRainSound() function
- createCafeSound() function  
- createFireplaceSound() function
- Volume control implementation
- Sound persistence via localStorage
```

**Missing File:** `frontend/src/utils/soundGenerator.js` (copy logic from vanilla JS)

---

### 6. PARTICIPANTS LIST - INCOMPLETE RENDERING ⚠️
**Status:** Logic exists but rendering issues

**Current Issues in RoomPage.jsx:**
```jsx
// Problem: Participants not fully rendered
// The localParticipants state updates but JSX doesn't exist

// Missing JSX:
<div className="participants-section">
  <h3>👥 Studying Now</h3>
  
  {/* Transfer host button for host only */}
  {isHost && (
    <button onClick={handleTransferHost} className="btn-transfer-host">
      👑 Transfer Host Role
    </button>
  )}
  
  {/* Participant list */}
  <div className="participant-list">
    {localParticipants?.map(participant => (
      <div key={participant.user_id} className="participant-card">
        <div className="participant-avatar">
          {participant.username.charAt(0).toUpperCase()}
        </div>
        <div className="participant-info">
          <div className="participant-name">
            {participant.username}
            {participant.is_host && <span>⭐</span>}
          </div>
          <div className="participant-status">
            {participant.is_host ? "👑 Host" : "Member"}
          </div>
        </div>
        
        {isHost && !participant.is_host && (
          <button 
            onClick={() => handleRemoveParticipant(participant.user_id)}
            className="btn-remove"
          >
            ✕
          </button>
        )}
      </div>
    ))}
  </div>
</div>

// Missing Transfer Host Modal:
{showTransferModal && (
  <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <h2>👑 Transfer Host Role</h2>
      <p>Select a participant to transfer host role to:</p>
      <div className="participant-options">
        {localParticipants
          ?.filter(p => !p.is_host)
          .map(p => (
            <label key={p.user_id}>
              <input
                type="radio"
                name="newHost"
                value={p.user_id}
                checked={selectedTransferUser === p.user_id}
                onChange={e => setSelectedTransferUser(e.target.value)}
              />
              {p.username}
            </label>
          ))}
      </div>
      <button onClick={handleTransferHost}>Confirm</button>
      <button onClick={() => setShowTransferModal(false)}>Cancel</button>
    </div>
  </div>
)}
```

---

## MEDIUM-PRIORITY GAPS

### 7. AUTHENTICATION - Full Name Field Missing ⚠️
**File:** `frontend/src/pages/AuthPage.jsx`

**Missing:**
```jsx
// In signup form:
<div className="form-group">
  <label htmlFor="fullName">Full Name</label>
  <input
    id="fullName"
    type="text"
    value={fullName}
    onChange={(e) => setFullName(e.target.value)}
    placeholder="Your full name"
    required
  />
</div>

// State:
const [fullName, setFullName] = useState("");

// When calling signup:
const success = await signup(email, password, username, fullName);  // Add fullName
```

**Affects:**
- User profile display (no full name stored)
- Dashboard stats (uses username instead)

---

### 8. TIMER - Session Count Missing ⚠️
**File:** `frontend/src/pages/RoomPage.jsx`

**Missing:**
```jsx
// In timer section, add:
<div className="session-info">
  <p>Session <span className="session-number">{roomState.sessionCount || 1}</span></p>
</div>

// State tracking:
const [sessionCount, setSessionCount] = useState(1);

// Handle timer transitions:
socket.on("timer:transitioned", (data) => {
  if (data.newState === "STUDY" && roomState.timerState === "BREAK") {
    setSessionCount(prev => prev + 1);  // Increment on break→study
  }
  setRoomState({ timerState: data.newState });
});
```

---

### 9. TIMER - Audio Notifications Missing ⚠️
**File:** `frontend/src/pages/RoomPage.jsx` or new hook `useTimerNotifications`

**Missing:**
```javascript
// On timer completion (in useEffect):
socket.on("timer:finished", (data) => {
  playTimerNotification(data.mode);  // 'study' or 'break'
  showNotification(`${data.mode === 'study' ? 'Study' : 'Break'} time finished!`);
});

// Function to play sound:
const playTimerNotification = (mode) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  if (mode === "study") {
    // 3 ascending beeps
    playBeeps(audioContext, [800, 1000, 1200], 200, 100);
  } else {
    // 2 descending beeps
    playBeeps(audioContext, [1200, 800], 200, 150);
  }
};
```

---

### 10. ROOM STATE - Host Status Detection Needs Verification ⚠️
**File:** `frontend/src/pages/RoomPage.jsx`

**Current Issue:**
```jsx
// This logic exists but may have bugs:
const isHost =
  localParticipants &&
  localParticipants.some(
    (p) =>
      p.is_host &&
      String(p.user_id).toLowerCase() === String(currentUser?.id).toLowerCase(),
  );

// Need to verify:
1. Does p.is_host exist in participant data?
2. Is user_id correctly compared with currentUser.id?
3. Is localParticipants getting updated from socket?

// Better approach:
useEffect(() => {
  console.log("[RoomPage] Checking host status:", {
    participants: localParticipants,
    currentUserId: currentUser?.id,
  });
  
  const hostParticipant = localParticipants?.find(p => p.is_host);
  setIsHost(
    hostParticipant?.user_id === currentUser?.id
  );
}, [localParticipants, currentUser?.id]);
```

---

## STYLING GAPS - CSS CLASSES MISSING

### App.css Needs

```css
/* Dashboard Page */
.dashboard-page { /* ... */ }
.dashboard-header { /* ... */ }
.dashboard-container { /* ... */ }
.dashboard-profile { /* ... */ }
.profile-card { /* ... */ }
.profile-avatar-section { /* ... */ }
.profile-picture { /* ... */ }
.profile-avatar { /* ... */ }
.profile-info { /* ... */ }
.profile-stats { /* ... */ }
.stat-item { /* ... */ }
.stat-label { /* ... */ }
.profile-actions { /* ... */ }

/* Dashboard Sessions */
.dashboard-sessions { /* ... */ }
.session-filters { /* ... */ }
.filter-input { /* ... */ }
.session-list { /* ... */ }
.session-item { /* ... */ }
.session-header { /* ... */ }
.session-room { /* ... */ }
.session-duration { /* ... */ }
.session-details { /* ... */ }
.session-detail { /* ... */ }
.session-detail-label { /* ... */ }

/* Waiting Room */
.waiting-room-page { /* ... */ }
.waiting-room-container { /* ... */ }
.loading-spinner { /* ... */ }

/* Chat in RoomPage */
.chat-section { /* ... */ }
.chat-container { /* ... */ }
.chat-messages { /* ... */ }
.chat-message { /* ... */ }
.chat-message.own { /* ... */ }
.chat-message.other { /* ... */ }
.chat-message-sender { /* ... */ }
.chat-message-text { /* ... */ }
.chat-message-time { /* ... */ }
.chat-input-form { /* ... */ }

/* Participants Section */
.participant-card { /* ... */ }
.participant-avatar { /* ... */ }
.participant-info { /* ... */ }
.participant-name { /* ... */ }
.participant-status { /* ... */ }
.btn-remove { /* ... */ }

/* Timer Settings Modal */
.modal-overlay { /* ... */ }
.modal-content { /* ... */ }
.form-group { /* ... */ }
.form-hint { /* ... */ }

/* Ambient Sounds Enhanced */
.ambient-section { /* ... */ }
.sound-buttons { /* ... */ }
.sound-btn { /* ... */ }
.sound-btn.active { /* ... */ }
.volume-control { /* ... */ }
```

---

## IMPLEMENTATION PRIORITY CHECKLIST

### Phase 1: Critical Path (1-2 weeks)
- [ ] Implement Dashboard page with profile and session logs
- [ ] Integrate Chat into RoomPage
- [ ] Fix Participants list rendering
- [ ] Implement Join Request workflow

### Phase 2: Core Features (1 week)
- [ ] Timer settings modal
- [ ] Ambient sounds with Web Audio API
- [ ] Audio notifications for timer
- [ ] Session count tracking

### Phase 3: Polish (3-5 days)
- [ ] Complete CSS styling
- [ ] Error boundaries and notifications
- [ ] Input validation
- [ ] Responsive design refinements

### Phase 4: Testing & Deployment
- [ ] Integration testing
- [ ] Socket event testing
- [ ] API endpoint testing
- [ ] User acceptance testing

---

## SUMMARY
**React Frontend Completion: ~50%**

Most critical gaps:
1. **Dashboard page (0% complete)** - Affects user stats and profile
2. **Chat integration (0% complete)** - Core collaboration feature
3. **Join request workflow (0% complete)** - Needed for private rooms
4. **Timer settings (0% complete)** - User customization

Estimated effort to complete: **2-3 weeks** for an experienced React developer.
