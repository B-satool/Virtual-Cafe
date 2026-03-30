# Virtual Café - API Documentation

## Base URL

```
http://localhost:3000
ws://localhost:3000 (WebSocket)
```

---

## REST Endpoints

### Health Check

**GET** `/`

Returns the main application page.

**Response:** HTML page (200 OK)

---

### Room Management

#### Get All Public Rooms

**GET** `/api/rooms/public`

Retrieve all available public rooms.

**Response:** 200 OK

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "roomCode": "study-group-01",
    "isPublic": true,
    "participantCount": 3,
    "capacity": 10,
    "status": "study",
    "createdAt": "2026-03-30T10:30:00Z"
  }
]
```

**Errors:**
- 500: Server error

---

#### Get Room Details

**GET** `/api/rooms/:roomCode`

Get details of a specific room by its code.

**Parameters:**
- `roomCode` (path): The room code (e.g., "study-group-01")

**Response:** 200 OK

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "roomCode": "study-group-01",
  "isPublic": true,
  "participantCount": 3,
  "capacity": 10,
  "status": "study",
  "createdAt": "2026-03-30T10:30:00Z"
}
```

**Errors:**
- 404: Room not found

---

#### Create a Room

**POST** `/api/rooms`

Create a new study room.

**Request Body:**

```json
{
  "roomCode": "study-group-02",
  "isPublic": true,
  "capacity": 15
}
```

**Parameters:**
- `roomCode` (string, required): Unique identifier for the room
- `isPublic` (boolean, optional, default: true): Whether room is publicly visible
- `capacity` (number, optional, default: 10): Maximum participants

**Response:** 201 Created

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "roomCode": "study-group-02",
  "isPublic": true,
  "capacity": 15
}
```

**Errors:**
- 400: Room code already exists

---

## WebSocket Events

### Connection Flow

1. Client connects to WebSocket server
2. Client emits `room:join` with room code and username
3. Server validates and adds client to room
4. Server broadcasts to all room participants
5. Client receives full room state and participates

### Client → Server Events

#### Join Room

**Event:** `room:join`

**Data:**

```json
{
  "roomCode": "study-group-01",
  "username": "John Doe"
}
```

**Response:** 
- Success: Receives `room:state` event with full state
- Error: Receives `error` event with message

**Example:**

```javascript
socket.emit('room:join', {
  roomCode: 'study-group-01',
  username: 'John Doe'
});
```

---

### Timer Events

#### Start Timer

**Event:** `timer:start`

**Data:** (none)

**Restrictions:** Host only

**Response:** Broadcasting `timer:started` to all participants

```javascript
socket.emit('timer:start');
```

---

#### Pause Timer

**Event:** `timer:pause`

**Data:** (none)

**Restrictions:** Host only

**Response:** Broadcasting `timer:paused` to all participants

```javascript
socket.emit('timer:pause');
```

---

#### Resume Timer

**Event:** `timer:resume`

**Data:** (none)

**Restrictions:** Host only

**Response:** Broadcasting `timer:resumed` to all participants

```javascript
socket.emit('timer:resume');
```

---

#### Reset Timer

**Event:** `timer:reset`

**Data:** (none)

**Restrictions:** Host only

**Response:** Broadcasting `timer:reset` to all participants

```javascript
socket.emit('timer:reset');
```

---

### Task Events

#### Add Task

**Event:** `task:add`

**Data:**

```json
{
  "title": "Complete assignment"
}
```

**Response:** Broadcasting `task:added` to all participants

```javascript
socket.emit('task:add', {
  title: 'Complete assignment'
});
```

---

#### Update Task

**Event:** `task:update`

**Data:**

```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "updates": {
    "completed": true
  }
}
```

**Response:** Broadcasting `task:updated` to all participants

```javascript
socket.emit('task:update', {
  taskId: 'task-uuid',
  updates: { completed: true }
});
```

---

#### Delete Task

**Event:** `task:delete`

**Data:**

```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** Broadcasting `task:deleted` to all participants

```javascript
socket.emit('task:delete', {
  taskId: 'task-uuid'
});
```

---

#### Request Room State

**Event:** `room:requestState`

**Data:** (none)

**Response:** Direct response with `room:state` event

```javascript
socket.emit('room:requestState');
```

---

### Server → Client Events

#### Room State

**Event:** `room:state`

**Data:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "roomCode": "study-group-01",
  "isPublic": true,
  "capacity": 10,
  "participants": [
    {
      "userId": "socket-id-1",
      "username": "John Doe",
      "joinedAt": "2026-03-30T10:30:00Z",
      "isHost": true
    }
  ],
  "tasks": [
    {
      "id": "task-uuid-1",
      "title": "Complete assignment",
      "completed": false,
      "createdBy": "socket-id-1",
      "createdAt": "2026-03-30T10:35:00Z"
    }
  ],
  "timerState": {
    "isRunning": true,
    "mode": "study",
    "timeRemaining": 1200,
    "totalTime": 1500,
    "startedAt": "2026-03-30T10:35:00Z",
    "pausedAt": null,
    "sessionCount": 1
  },
  "participantCount": 1
}
```

---

#### User Joined

**Event:** `user:joined`

**Data:**

```json
{
  "userId": "socket-id-2",
  "username": "Jane Doe",
  "isHost": false,
  "participants": [
    {
      "userId": "socket-id-1",
      "username": "John Doe",
      "joinedAt": "2026-03-30T10:30:00Z",
      "isHost": true
    },
    {
      "userId": "socket-id-2",
      "username": "Jane Doe",
      "joinedAt": "2026-03-30T10:40:00Z",
      "isHost": false
    }
  ]
}
```

---

#### User Left

**Event:** `user:left`

**Data:**

```json
{
  "userId": "socket-id-2",
  "username": "Jane Doe",
  "participants": [
    {
      "userId": "socket-id-1",
      "username": "John Doe",
      "joinedAt": "2026-03-30T10:30:00Z",
      "isHost": true
    }
  ]
}
```

---

#### Timer Events

**Event:** `timer:started` | `timer:paused` | `timer:resumed` | `timer:reset` | `timer:tick` | `timer:transitioned`

**Data:** (Timer state object)

```json
{
  "isRunning": true,
  "mode": "study",
  "timeRemaining": 1200,
  "totalTime": 1500,
  "startedAt": "2026-03-30T10:35:00Z",
  "pausedAt": null,
  "sessionCount": 1
}
```

---

#### Task Events

**Event:** `task:added` | `task:updated` | `task:deleted`

**Data (task:added):**

```json
{
  "id": "task-uuid-2",
  "title": "Study for exam",
  "completed": false,
  "createdBy": "socket-id-1",
  "createdAt": "2026-03-30T10:45:00Z"
}
```

**Data (task:updated):**

```json
{
  "taskId": "task-uuid-2",
  "updates": {
    "completed": true
  }
}
```

**Data (task:deleted):**

```json
{
  "taskId": "task-uuid-2"
}
```

---

#### Error

**Event:** `error`

**Data:**

```json
{
  "message": "Room is full"
}
```

---

## Error Handling

### HTTP Error Codes

| Code | Message | Cause |
|------|---------|-------|
| 400 | Bad Request | Invalid input (e.g., duplicate room code) |
| 404 | Not Found | Room doesn't exist |
| 500 | Internal Server Error | Server error |

### WebSocket Error Responses

All socket errors are emitted as `error` events:

```javascript
socket.on('error', (data) => {
  console.error(data.message);
});
```

Common error messages:
- "Room not found"
- "Room is full"
- "Only the host can perform this action"
- "Invalid room code"

---

## Rate Limiting (Future)

When implemented:
- 100 requests per minute per IP (REST)
- 1000 events per minute per socket (WebSocket)

---

## Authentication (Future)

When implemented:
- JWT tokens for REST endpoints
- Bearer token in Authorization header
- WebSocket authentication on connection

```javascript
socket.emit('authenticate', {
  token: 'jwt-token'
});
```

---

## Examples

### Complete Example: Create and Join Room

```javascript
// 1. Create room via REST API
fetch('/api/rooms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roomCode: 'study-group-01',
    isPublic: true,
    capacity: 10
  })
}).then(res => res.json());

// 2. Initialize WebSocket
const socket = io();

// 3. Join room
socket.emit('room:join', {
  roomCode: 'study-group-01',
  username: 'John Doe'
});

// 4. Receive room state
socket.on('room:state', (state) => {
  console.log('Room state:', state);
});

// 5. Start timer (if host)
socket.emit('timer:start');

// 6. Add task
socket.emit('task:add', { title: 'My task' });

// 7. Listen for updates
socket.on('task:added', (task) => {
  console.log('Task added:', task);
});
```

---

## Testing with cURL and wscat

### REST Endpoints

```bash
# Get public rooms
curl http://localhost:3000/api/rooms/public

# Create room
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"roomCode":"test-01","isPublic":true,"capacity":10}'

# Get room details
curl http://localhost:3000/api/rooms/test-01
```

### WebSocket Testing with wscat

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:3000

# Send events
> {"event":"room:join","roomCode":"test-01","username":"TestUser"}

# Receive events (server will broadcast)
```

---

## Pagination (Future)

When implemented for large room lists:

```bash
GET /api/rooms/public?page=1&limit=20&sort=created
```

---

**Last Updated**: March 30, 2026
