# Virtual Café - Development Guide

## Project Setup for Developers

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Virtual Cafe"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## Project Structure

```
Virtual Cafe/
├── server.js                      # Main server file (Node.js + Express + Socket.IO)
├── package.json                   # Dependencies and scripts
├── .env.example                   # Environment variables template
├── .gitignore                     # Git ignore rules
│
├── public/                        # Frontend assets
│   ├── index.html                # Main application file
│   └── assets/                   # Images, sounds (future)
│
├── src/                          # Source code (for modularization)
│   ├── models/                   # Data models (future)
│   ├── routes/                   # API routes (future)
│   ├── controllers/              # Business logic (future)
│   └── middleware/               # Express middleware (future)
│
├── Documentation/
│   ├── README.md                 # Project overview
│   ├── DEPLOYMENT.md             # Deployment instructions
│   ├── API_DOCUMENTATION.md      # API reference
│   └── DEVELOPMENT.md            # This file
│
└── Project Docs/
    ├── WBAD Project Proposal.md  # Project specification
    └── workflow.txt              # Workflow descriptions
```

---

## Code Organization

### Backend (server.js)

The server is organized into sections:

1. **Imports and Setup**
   - Express, Socket.IO, middleware

2. **Data Structures**
   - `StudyRoom` class
   - In-memory Maps for storage

3. **Room Management**
   - Room creation and participant management
   - Task CRUD operations

4. **Timer Management**
   - Timer state updates
   - Automatic mode transitions
   - Interval management

5. **REST API Endpoints**
   - GET `/api/rooms/public`
   - GET `/api/rooms/:roomCode`
   - POST `/api/rooms`

6. **WebSocket Handlers**
   - Room events
   - Timer events
   - Task events

### Frontend (public/index.html)

The frontend uses vanilla JavaScript with sections:

1. **HTML Structure**
   - Landing page
   - Room page with tabs

2. **CSS Styling**
   - Global styles (colors, fonts)
   - Component styles (cards, buttons, timers)
   - Responsive design

3. **JavaScript**
   - Socket initialization
   - Event handlers
   - UI updates
   - Utility functions

---

## Development Workflow

### Adding a New Feature

1. **Define the feature requirement**
   - What should it do?
   - Who can use it?
   - What data does it need?

2. **Backend Implementation**
   - Add data to `StudyRoom` class
   - Add socket event handlers
   - Add REST endpoints if needed
   - Test with console logs

3. **Frontend Implementation**
   - Update HTML structure
   - Add CSS styles
   - Add event listeners
   - Connect to socket events

4. **Testing**
   - Test with multiple browsers
   - Check WebSocket communication
   - Verify data synchronization

5. **Documentation**
   - Update README
   - Document API changes
   - Add code comments

### Example: Adding a Feature

**Feature: Task Descriptions**

1. **Backend**
   ```javascript
   // Update StudyRoom.addTask()
   addTask(taskId, title, description, userId) {
     this.tasks.push({
       id: taskId,
       title,
       description,  // NEW
       completed: false,
       createdBy: userId,
       createdAt: new Date()
     });
   }

   // Update socket handler
   socket.on('task:add', (data) => {
     const taskId = uuidv4();
     room.addTask(taskId, data.title, data.description, socket.id);
     io.to(room.id).emit('task:added', {...});
   });
   ```

2. **Frontend**
   ```javascript
   // Update form
   const description = document.getElementById('taskDescription').value;
   socket.emit('task:add', { title, description });

   // Update task display
   <div class="task-description">${task.description}</div>
   ```

3. **Test & Document**

---

## Debugging

### Console Logging

Use console logs strategically:

```javascript
// Backend
console.log(`User ${username} joined room ${roomCode}`);

// Frontend
console.log('Timer state:', timerState);
```

### Browser DevTools

1. **Network Tab**
   - Monitor WebSocket messages
   - Check HTTP requests
   - View headers and payloads

2. **Console Tab**
   - Log JavaScript errors
   - Test socket events
   - Inspect object states

3. **Application Tab**
   - Debug Socket.IO connections
   - Check browser storage

### Server Debugging

```bash
# Start with inspect
node --inspect server.js

# In Chrome: chrome://inspect
```

---

## Performance Optimization

### Frontend

1. **Minimize DOM Updates**
   - Batch updates where possible
   - Use document fragments

2. **Lazy Load**
   - Load rooms on demand
   - Pagination for task lists

3. **Debounce Events**
   - Throttle rapid updates
   - Prevent duplicate requests

### Backend

1. **Connection Pooling**
   - Reuse database connections
   - Manage Socket.IO connections

2. **Caching**
   - Cache room lists
   - Reduce database queries

3. **Message Compression**
   - Enable gzip compression
   - Minify transport messages

---

## Testing Guide

### Manual Testing Checklist

```
Room Management:
- [ ] Create public room
- [ ] Create private room
- [ ] Join existing room
- [ ] Leave room
- [ ] View room list
- [ ] Room code validation

Pomodoro Timer:
- [ ] Start timer
- [ ] Pause timer
- [ ] Resume timer
- [ ] Reset timer
- [ ] Mode transition (study → break)
- [ ] Mid-session join sync
- [ ] Page refresh recovery
- [ ] Host change handling

Tasks:
- [ ] Add task
- [ ] Complete task
- [ ] Delete task
- [ ] Real-time sync
- [ ] Task persistence

Participants:
- [ ] See participant list
- [ ] See join notifications
- [ ] See leave notifications
- [ ] See host badge
- [ ] Avatar display

Ambient Sounds:
- [ ] Toggle rain
- [ ] Toggle café chatter
- [ ] Toggle fireplace
- [ ] Adjust volume
- [ ] Multiple sounds simultaneously

Responsive Design:
- [ ] Desktop (1920px)
- [ ] Tablet (768px)
- [ ] Mobile (375px)
- [ ] Touch interactions
```

### Automated Testing (Future)

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

---

## Code Style

### JavaScript

- Use camelCase for variables and functions
- Use PascalCase for classes
- Use UPPER_SNAKE_CASE for constants
- Add JSDoc comments for complex functions

```javascript
/**
 * Adds a task to the room
 * @param {string} taskId - Unique task identifier
 * @param {string} title - Task title
 * @param {string} userId - User who created the task
 */
function addTask(taskId, title, userId) {
  // Implementation
}
```

### HTML

- Use semantic tags (main, section, header, footer)
- Use data-* attributes for custom data
- Keep indentation consistent (2 spaces)

### CSS

- Use BEM naming convention when applicable
- Group related styles together
- Use custom properties for colors

```css
:root {
  --primary-color: #5c4033;
  --secondary-color: #8d6e63;
}

.button {
  background: var(--primary-color);
}

.button--secondary {
  background: var(--secondary-color);
}
```

---

## Git Workflow

### Branching

```bash
# Create feature branch
git checkout -b feature/task-descriptions

# Make changes
git add .
git commit -m "Add task descriptions feature"

# Push to remote
git push origin feature/task-descriptions

# Create pull request
```

### Commit Messages

```
<type>: <subject>

<body>

<footer>
```

Types: feat, fix, docs, style, refactor, test, chore

```
feat: Add task descriptions

Implement the ability to add descriptions to tasks
that are visible to all room participants.

Fixes #123
```

---

## Database Migration (When Adding Persistence)

### Current (In-Memory)

```javascript
const rooms = new Map();
```

### Future (MongoDB)

```javascript
const mongoose = require('mongoose');
const roomSchema = new mongoose.Schema({
  roomCode: String,
  participants: [String],
  tasks: Array,
  timerState: Object
});
```

---

## Common Issues & Solutions

### Issue: WebSocket Not Connecting

**Symptoms:** 
- Timer not syncing
- Real-time updates not working

**Solution:**
1. Check CORS settings
2. Verify port is correct
3. Check browser console for errors
4. Restart server

```javascript
// Enable detailed Socket.IO logging
const io = socketIO(server, { 
  transports: ['websocket', 'polling'],
  debug: true 
});
```

### Issue: Timer Not Syncing Across Devices

**Symptoms:**
- Different countdown on different devices
- Timer stuck on one value

**Solution:**
1. Use server time, not client time
2. Synchronize on each update
3. Request state after join

```javascript
// Use Date.now() from server, not client
const elapsedTime = (Date.now() - room.timerState.startedAt) / 1000;
```

### Issue: Tasks Not Persisting

**Symptoms:**
- Tasks disappear after page refresh
- Tasks not visible to other users

**Solution:**
1. Check socket connection
2. Verify task emit is working
3. Check room state update logic

---

## Performance Monitoring

### Metrics to Track

1. **Response Time**
   - REST endpoint latency
   - WebSocket message round-trip

2. **Server Load**
   - Active connections
   - Memory usage
   - CPU usage

3. **User Experience**
   - Timer accuracy
   - Real-time update latency
   - Page load time

### Tools

```bash
# Monitor server performance
npm install --save node-inspect
node --inspect server.js

# Monitor client performance
// In browser console
performance.measure('taskAdded');
```

---

## Future Enhancements

### In Priority Order

1. **Database Integration**
   - Replace in-memory storage
   - Implement persistence
   - Add user accounts

2. **Authentication**
   - User registration
   - Session management
   - Password hashing

3. **Audio Files**
   - Real ambient sounds
   - Audio streaming
   - Volume normalization

4. **Advanced Features**
   - Task categories
   - Session analytics
   - User profiles

5. **Scaling**
   - Redis for session store
   - Horizontal scaling
   - Load balancing

---

## Useful Resources

- [Express.js Documentation](https://expressjs.com/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [Node.js Performance](https://nodejs.org/en/docs/guides/nodejs-performance-hooks/)
- [Web Development Best Practices](https://developer.mozilla.org/en-US/)

---

**Last Updated**: March 30, 2026
