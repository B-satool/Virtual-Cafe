# SIDE-BY-SIDE COMPARISON - KEY IMPLEMENTATIONS

## 1. AUTHENTICATION FLOW

### Vanilla JS (Complete)
```javascript
// public/js/modules/auth.js
export async function handleLoginSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: getHeaders(false),
        body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (!response.ok) {
        showError(errorDiv, data.error || 'Login failed');
        return;
    }
    
    // Store THREE tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('currentUsername', data.username || email.split('@')[0]);
    
    showLandingPage();
    window.dispatchEvent(new CustomEvent('auth:success'));
}
```

### React (Incomplete)
```javascript
// frontend/src/hooks/useAuth.js
const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed");

        // Store ONE token only
        localStorage.setItem("userToken", data.token);
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("username", data.username || email.split("@")[0]);

        setUser({
            id: data.userId,
            username: data.username || email.split("@")[0],
        });
        setIsAuthenticated(true);
        return true;
    } catch (err) {
        setError(err.message);
        return false;
    } finally {
        setLoading(false);
    }
}, []);
```

**Differences:**
- Vanilla stores `accessToken` + `refreshToken` + `userId`
- React stores `userToken` + `userId`
- Vanilla uses custom event dispatch
- React returns boolean

**Issue:** Token format mismatch - React should mirror vanilla's dual-token approach

---

## 2. ROOM MANAGEMENT - JOIN FLOW

### Vanilla JS (Complete with Join Requests)
```javascript
// public/js/modules/room.js
export async function joinRoomWithUsername(roomCode, username) {
    const { socket } = getSocketState();
    const userId = localStorage.getItem('userId');
    
    try {
        const response = await fetch('/api/rooms/join', {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify({ room_code: roomCode, user_id: userId })
        });
        
        const data = await response.json();
        
        if (data.requiresApproval) {
            // Host must approve - show waiting room
            showWaitingRoom();
            return; // ← Shows approval pending UI
        }
        
        // Immediate access granted
        localStorage.setItem('currentRoom', roomCode);
        localStorage.setItem('currentUsername', username);
        socket.emit('room:join', {
            roomCode: roomCode,
            userId: userId,
            username: username
        });
        showRoomPage();
    } catch (error) {
        showError(...)
    }
}

export function showWaitingRoom() {
    hideAllPages();
    document.getElementById('waitingRoomPage').style.display = 'flex';
}
```

### React (Missing Join Request)
```javascript
// frontend/src/hooks/useRoom.js
const joinRoom = useCallback(async (roomCode) => {
    setLoading(true);
    try {
        const res = await fetch("/api/rooms/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                room_code: roomCode,
                user_id: userId,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to join room");

        const room = data.room;
        localStorage.setItem("currentRoom", JSON.stringify(room));
        setCurrentRoom(room);
        // ❌ No check for requiresApproval
        // ❌ No waiting room display
        return room;
    } catch (err) {
        setError(err.message);
        return null;
    } finally {
        setLoading(false);
    }
}, [userId]);
```

**Missing from React:**
- No `requiresApproval` check
- No WaitingRoomPage component
- No join request approval workflow

---

## 3. TIMER MANAGEMENT

### Vanilla JS (Complete)
```javascript
// public/js/modules/timer.js
export function updateTimerUI(timerState) {
    const timerDisplay = document.getElementById('timerDisplay');
    
    // Sync time
    const timeRemaining = timerState.timeRemaining || 1500;
    timerDisplay.textContent = formatTime(timeRemaining);
    
    // Sync mode
    const timerMode = document.getElementById('timerMode');
    timerMode.textContent = timerState.mode === 'study' ? 
        '📚 Study Mode' : '☕ Break Time';
    
    // Sync controls visibility
    const { isHost } = getSocketState();
    const timerControls = document.getElementById('timerControls');
    timerControls.style.display = isHost ? 'flex' : 'none';
    
    // Update button visibility based on state
    if (timerState.isRunning) {
        document.getElementById('startTimerBtn').style.display = 'none';
        document.getElementById('pauseTimerBtn').style.display = 'inline-block';
    } else {
        document.getElementById('startTimerBtn').style.display = 'inline-block';
        document.getElementById('pauseTimerBtn').style.display = 'none';
    }
}

export function startTimer() {
    const { socket } = getSocketState();
    socket.emit('timer:start');
}

// public/js/modules/timerSettings.js
export function showTimerSettings() {
    const { isHost } = getSocketState();
    if (!isHost) {
        alert("Only the room host can modify timer settings.");
        return;
    }
    const settings = getTimerSettings();
    document.getElementById('studyDuration').value = settings.studyDuration / 60;
    document.getElementById('breakDuration').value = settings.breakDuration / 60;
    document.getElementById('timerSettingsModal').style.display = 'flex';
}

export function saveTimerSettings() {
    const { socket, currentRoom } = getSocketState();
    const studyMinutes = parseInt(document.getElementById('studyDuration').value);
    const breakMinutes = parseInt(document.getElementById('breakDuration').value);
    
    socket.emit('timer:configure', {
        roomCode: currentRoom,
        studyDuration: studyMinutes * 60,
        breakDuration: breakMinutes * 60,
    });
}
```

### React (Incomplete - No Settings)
```javascript
// frontend/src/pages/RoomPage.jsx
useEffect(() => {
    setTimerDisplay(formatTime(roomState.timerSeconds || 1500));
}, [roomState.timerSeconds]);

const handleStartTimer = () => {
    if (!isTimerRunning) {
        emitEvent("timer:start", { room_code: currentRoom.room_code });
        setIsTimerRunning(true);
    }
};

// Timer settings modal: ❌ NOT IMPLEMENTED
// showTimerSettings() called but never defined
// No socket.emit('timer:configure', ...) 
// No timer duration customization

const handleSoundChange = (sound) => {
    setAmbientSound(sound);
    // ❌ No actual audio implementation
    if (audioRef.current) {
        if (sound === "none") {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(err => console.log(err));
        }
    }
};
```

**Issues:**
- Timer settings modal referenced but not implemented
- No timer duration customization UI
- No timer configuration socket emit
- Ambient sound logic incomplete (audioRef but no audio setup)

---

## 4. CHAT SYSTEM

### Vanilla JS (Complete)
```javascript
// public/js/modules/chat.js
export function sendChatMessage() {
    const { socket, currentRoom } = getSocketState();
    const chatInput = document.getElementById("chatInput");
    const message = chatInput.value.trim();
    if (!message) return;

    const username = localStorage.getItem("currentUsername") || "Guest";
    const userId = localStorage.getItem("userId");

    socket.emit("chat:message", {
        roomCode: currentRoom,
        userId,
        username,
        message,
        timestamp: new Date().toISOString(),
    });

    chatInput.value = "";
    chatInput.focus();
}

export function displayChatMessage(data) {
    const chatMessages = document.getElementById("chatMessages");
    const currentUserId = localStorage.getItem("userId");
    const isOwnMessage = String(data.userId).toLowerCase() === 
                        String(currentUserId).toLowerCase();

    const messageEl = document.createElement("div");
    messageEl.className = `chat-message ${isOwnMessage ? "own" : "other"}`;

    const timeStr = new Date(data.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    messageEl.innerHTML = `
        <div class="chat-message-sender">${escapeHtml(data.username)}</div>
        <div class="chat-message-text">${escapeHtml(data.message)}</div>
        <div class="chat-message-time">${timeStr}</div>
    `;

    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;  // Auto-scroll
}

export function loadChatHistory(messages) {
    const chatMessages = document.getElementById("chatMessages");
    chatMessages.innerHTML = "";
    messages.forEach((msg) => {
        displayChatMessage(msg);
    });
}
```

### React (Not Integrated)
```javascript
// frontend/src/pages/RoomPage.jsx
// ❌ Chat state exists but is NOT rendered:
const [chatMessages, setChatMessages] = useState([]);
const [chatInput, setChatInput] = useState("");

// ❌ Socket listeners set up but JSX missing:
socket.on("chat:message", (data) => {
    // This handler is set up but never fires because
    // React RoomPage doesn't have chat section in JSX
});

// ❌ Send handler exists but button/input not in JSX:
const handleSendChat = (e) => {
    e.preventDefault();
    // Never called because there's no form
};

// ❌ Missing from JSX:
// No chat-messages container
// No chat-input field
// No chat display section at all

// Chat module exists in vanilla but React doesn't call it
// frontend/src/utils/api.js defines chat endpoints but they're never used
```

**Issues:**
- Chat state defined but JSX not rendered in RoomPage
- No chat input field in UI
- Socket listeners set up but chat section missing
- Chat history never loaded
- No form to send messages

---

## 5. PARTICIPANTS MANAGEMENT

### Vanilla JS (Complete)
```javascript
// public/js/modules/room.js
export function updateParticipants(participants) {
    const participantList = document.getElementById("participantList");
    if (!participants || participants.length === 0) {
        participantList.innerHTML = '<div class="empty-state">No participants</div>';
        return;
    }

    const { isHost: currentUserIsHost } = getSocketState();
    const currentUserId = localStorage.getItem("userId");

    // Build participant cards with remove buttons
    const participantCards = participants
        .map((p) => {
            const isPHost = p.isHost || p.is_host || false;
            const isCurrentUser = String(p.user_id).toLowerCase() === 
                                 String(currentUserId).toLowerCase();

            const removeBtn = currentUserIsHost && !isPHost && !isCurrentUser
                ? `<button class="btn-remove-participant" 
                    onclick="removeParticipant('${p.user_id}')">✕</button>`
                : "";

            return `
                <div class="participant">
                    <div class="participant-avatar">${p.username.charAt(0).toUpperCase()}</div>
                    <div class="participant-info">
                        <div class="participant-name">${escapeHtml(p.username)} 
                            ${isPHost ? "⭐" : ""}</div>
                        <div class="participant-status">${isPHost ? "👑 Host" : "Member"}</div>
                    </div>
                    ${removeBtn}
                </div>
            `;
        })
        .join("");

    const transferHostBtn = currentUserIsHost
        ? `<div class="transfer-host-section">
            <button class="btn-transfer-host" onclick="showTransferHostModal()">
                👑 Transfer Host Role
            </button>
           </div>`
        : "";

    participantList.innerHTML = transferHostBtn + participantCards;
}

export function showTransferHostModal() {
    const { socket, roomState } = getSocketState();
    const nonHostParticipants = (roomState.participants || []).filter(
        (p) => !(p.isHost || p.is_host)
    );

    if (nonHostParticipants.length === 0) {
        alert("No other participants available");
        return;
    }

    const options = nonHostParticipants
        .map(p => `<label><input type="radio" name="newHost" value="${p.user_id}"> 
                    ${escapeHtml(p.username)}</label>`)
        .join("");

    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal-content">
            <h2>👑 Transfer Host Role</h2>
            <form id="transferForm">
                ${options}
                <button type="submit" class="btn-primary">Confirm</button>
                <button type="button" class="btn-secondary">Cancel</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById("transferForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const selected = document.querySelector('input[name="newHost"]:checked');
        if (selected) {
            transferHost(selected.value);
            modal.remove();
        }
    });
}

export function removeParticipant(userId) {
    const { socket } = getSocketState();
    socket.emit("participant:remove", {
        room_code: localStorage.getItem("currentRoom"),
        userId: userId,
    });
}
```

### React (Partially Complete)
```javascript
// frontend/src/pages/RoomPage.jsx
const [showTransferModal, setShowTransferModal] = useState(false);
const [selectedTransferUser, setSelectedTransferUser] = useState(null);
const [localParticipants, setLocalParticipants] = useState(participants || []);

// Sync participants from props
useEffect(() => {
    if (participants && Array.isArray(participants)) {
        setLocalParticipants(participants);
    }
}, [participants, currentUser]);

// ⚠️ Transfer host handler exists
const handleTransferHost = () => {
    if (!selectedTransferUser) {
        showNotification("Please select a participant", "error");
        return;
    }
    emitEvent("host:transfer", {
        room_code: currentRoom.room_code,
        newHostId: selectedTransferUser,
    });
};

// ⚠️ Remove participant handler exists
const handleRemoveParticipant = (userId) => {
    if (!window.confirm("Are you sure?")) return;
    emitEvent("participant:remove", {
        room_code: currentRoom.room_code,
        userId,
    });
};

// ❌ But JSX is incomplete:
// Transfer modal UI exists in code but needs JSX in render
// Participant list rendering incomplete
// No participant cards rendering loop in JSX
// Missing from JSX:
// - Participant avatar display
// - Participant status ("Host" vs "Member")
// - Remove button for each participant
// - Transfer host modal form
```

**Issues:**
- Logic exists but JSX rendering incomplete
- No participant avatar styling
- No participant list loop in JSX
- Modal handlers defined but modal JSX incomplete
- Host status not visually displayed

---

## 6. SOCKET.IO - EVENT FLOW

### Vanilla JS (Complete)
```javascript
// Initialization
const socket = io();

socket.on('connect', () => {
    console.log('Connected');
});

// When joining room:
socket.emit('room:join', {
    roomCode: roomCode,
    userId: userId,
    username: username
});

// Listen for room state updates
socket.on('room:state', (data) => {
    setSocketState(roomCode, username, data.isHost, data);
    updateRoomUI(data);
    updateParticipants(data.participants);
    updateTimerUI(data.timer);
});

// Listen for timer events
socket.on('timer:started', () => updateTimerUI({...}));
socket.on('timer:tick', (data) => updateTimerUI({...}));
socket.on('timer:transitioned', (data) => updateTimerUI({...}));

// Listen for task events
socket.on('task:added', (data) => updateTasksUI([...]));
socket.on('task:updated', (data) => updateTasksUI([...]));
socket.on('task:deleted', (data) => updateTasksUI([...]));

// Listen for chat
socket.on('chat:message', (data) => displayChatMessage(data));

// Listen for room closure
socket.on('room:closed', () => {
    alert('Room closed by host');
    showLandingPage();
});

// Listen for participant changes
socket.on('participant:joined', (data) => {
    console.log('Participant joined');
    updateParticipants(data.participants);
});

socket.on('participant:left', (data) => {
    console.log('Participant left');
    updateParticipants(data.participants);
});

socket.on('host:transferred', (data) => {
    showNotification('Host role transferred');
});
```

### React (Partial - Missing handlers)
```javascript
// frontend/src/hooks/useSocket.js
const initializeSocket = useCallback((handlers = {}) => {
    const newSocket = io(window.location.origin, {...});

    newSocket.on('connect', () => {
        setIsConnected(true);
        if (roomCode) {
            newSocket.emit('room:join', {
                roomCode: roomCode,
                userId: userId,
                username: username,
            });
        }
    });

    // ✅ These handlers are set up:
    if (handlers.onParticipantJoined) {
        newSocket.on('participant:joined', handlers.onParticipantJoined);
    }
    if (handlers.onParticipantsUpdate) {
        newSocket.on('room:state', (data) => {
            handlers.onParticipantsUpdate(data);  // ← Handler passed but may not fire
        });
    }
    if (handlers.onTimerTick) {
        newSocket.on('timer:tick', handlers.onTimerTick);
    }

    // ❌ These are NOT set up:
    // socket.on('chat:message') - no chat handler
    // socket.on('chat:history') - no chat history
    // socket.on('join-request:*') - no join request events
    // socket.on('timer:configure') - no settings ack

    setSocket(newSocket);
}, [roomCode, userId, username]);
```

**Issues:**
- Chat event listeners not defined
- Join request events not handled
- Timer settings acknowledgment missing
- Some handlers defined but may not fire correctly
- No error event handling

---

## 7. API ENDPOINT USAGE

### Vanilla JS Endpoints Called
```javascript
✅ POST /api/auth/login
✅ POST /api/auth/signup
✅ GET  /api/auth/verify
✅ GET  /api/rooms
✅ POST /api/rooms/create
✅ POST /api/rooms/join
✅ GET  /api/user-profile        ← For dashboard
✅ GET  /api/session-logs        ← For dashboard
✅ PUT  /api/profiles/{userId}   ← For profile editing
✅ GET  /api/tasks/{roomId}
```

### React Endpoints Called
```javascript
✅ POST /api/auth/login
✅ POST /api/auth/signup
❌ GET  /api/auth/verify          (Defined but never called)
✅ GET  /api/rooms/public
✅ POST /api/rooms/create
✅ POST /api/rooms/join
❌ GET  /api/user-profile        (NEVER CALLED - no dashboard)
❌ GET  /api/session-logs        (NEVER CALLED - no dashboard)
❌ PUT  /api/profiles/{userId}   (NEVER CALLED - no profile editing)
✅ GET  /api/tasks/room/{roomId}
```

**Missing Calls:**
- Profile verification
- Dashboard data loading
- Session statistics
- Profile updating

---

## SUMMARY OF SIDE-BY-SIDE DIFFERENCES

| Component | Vanilla JS | React | Gap |
|-----------|-----------|-------|-----|
| Auth Flow | Complete with tokens | Partial, wrong token names | ⚠️ Token mismatch |
| Room Join | Full + join requests | Join requests missing | ❌ Join approval |
| Timer | Full + settings | Settings modal missing | ❌ No customization |
| Chat | Complete | Not integrated | ❌ Not in UI |
| Participants | Full rendering + actions | Logic only, JSX incomplete | ⚠️ Rendering incomplete |
| Socket Events | All handled | Many missing handlers | ⚠️ Incomplete handlers |
| API Calls | All endpoints used | 50% of endpoints used | ⚠️ Missing dashboard |
| Dashboard | Complete | Doesn't exist | ❌ Missing page |
| Ambient Sounds | Full with Web Audio | Buttons only | ❌ No audio generation |
