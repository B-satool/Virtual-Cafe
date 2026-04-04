# Virtual Café - React Frontend

React 18 frontend for Virtual Café, a collaborative Pomodoro study application with real-time features.

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable React components (future)
│   ├── contexts/            # React Context API definitions
│   │   └── AppContexts.js   # Auth, Room, Socket, Notification contexts
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.js       # Authentication logic
│   │   ├── useRoom.js       # Room management logic
│   │   └── useSocket.js     # Socket.io initialization and event handling
│   ├── pages/               # Page components (full page views)
│   │   ├── HomePage.jsx     # Landing/home page
│   │   ├── AuthPage.jsx     # Login/signup page
│   │   ├── LandingPage.jsx  # Room selection and creation
│   │   └── RoomPage.jsx     # Active study room interface
│   ├── utils/               # Utility functions
│   │   ├── api.js           # API client for HTTP requests
│   │   └── helpers.js       # Helper functions (format, sanitize, etc)
│   ├── App.jsx              # Main app component with routing logic
│   ├── App.css              # App-level styles
│   ├── index.jsx            # React root mount point
│   └── index.css            # Global styles
├── index.html               # Vite HTML template
├── vite.config.js           # Vite configuration
├── package.json             # Dependencies and scripts
└── package-lock.json        # Locked dependency versions
```

## Installation

### Prerequisites

- Node.js 16+ and npm/yarn
- Backend server running on `localhost:3001`

### Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Technology Stack

- **React 18**: UI library with hooks
- **Socket.io Client**: Real-time communication
- **Vite**: Build tool (fast dev experience)
- **Context API + useReducer**: State management (no Redux)
- **Fetch API**: HTTP requests

## Architecture Overview

### State Management

State is managed using React Context API with custom hooks:

1. **AuthContext** (`useAuth` hook)
   - User authentication state
   - Login/signup/logout functions
   - Error handling and loading states

2. **RoomContext** (`useRoom` hook)
   - Current room and room list
   - Participants and room state
   - Room creation, joining, and leaving
   - Task management

3. **SocketContext** (`useSocket` hook)
   - Socket.io connection instance
   - Real-time event listeners
   - Event emission methods

### Page Flow

```
HomePage (visitor)
    ↓
AuthPage (login/signup)
    ↓
LandingPage (room selection)
    ↓
RoomPage (active study room)
```

### Component Hierarchy

```
App
├── AuthContext.Provider
│   ├── RoomContext.Provider
│   │   └── SocketContext.Provider
│   │       └── AppContent
│   │           ├── HomePage
│   │           ├── AuthPage
│   │           ├── LandingPage
│   │           └── RoomPage
```

## Key Features

### Authentication (useAuth)

- Email/password login and signup
- JWT token storage in localStorage
- Automatic token refresh (future)
- Session restoration on app load

### Room Management (useRoom)

- Create public/private rooms with configurable capacity
- Join rooms via code or public list
- Real-time participant tracking
- Load and display public rooms
- Leave room and cleanup

### Real-time Communication (useSocket)

- Socket.io connection with auto-reconnect
- Event listeners for:
  - Participant joins/leaves
  - Timer state changes
  - Task updates
  - Room closure

### Pages

#### HomePage

- Welcome screen with feature showcase
- Call-to-action to get started

#### AuthPage

- Login form with email/password
- Signup form with username
- Toggle between modes
- Error display and validation

#### LandingPage

- List of public rooms to join
- Create new room modal
- Join private room with code modal
- Real-time room capacity display

#### RoomPage

- Pomodoro timer with controls (start/pause/reset)
- Ambient sound selector
- Shared task list with add/edit/delete
- Participant list with host indicator
- Real-time updates via Socket.io

## API Integration

The `utils/api.js` module provides typed API client:

```javascript
import { authAPI, roomAPI, taskAPI } from "./utils/api";

// Authentication
await authAPI.login(email, password);
await authAPI.signup(email, password, username);

// Rooms
await roomAPI.createRoom(name, isPrivate, capacity, userId);
await roomAPI.joinRoom(code, userId);
await roomAPI.getPublicRooms();

// Tasks
await taskAPI.getTasks(roomId);
await taskAPI.addTask(roomId, description, userId);
await taskAPI.updateTask(taskId, updates);
```

## Styling

- **CSS Modules** ready (can be implemented per component)
- **Global styles** in `src/index.css`
- **Component styles** inline or in separate files
- **Responsive design** with mobile breakpoints at 768px and 1024px

## Development Workflow

### Adding a New Hook

1. Create file in `src/hooks/useMyHook.js`
2. Export hook function with custom logic
3. Import in component and use:

```javascript
const { state, action } = useMyHook();
```

### Adding a New Page

1. Create file in `src/pages/MyPage.jsx`
2. Export component
3. Add routing logic in `App.jsx`'s `renderPage()`

### Adding Components

1. Create folder in `src/components/MyComponent/`
2. Create `MyComponent.jsx` and optional `.css` file
3. Import and use in pages

## Socket.io Events

### Listening to Events

```javascript
socket.on("timer:tick", (data) => {
  // { seconds: 1234 }
});

socket.on("participant:joined", (data) => {
  // { participant: { user_id, username, is_host } }
});

socket.on("task:added", (data) => {
  // { task: { id, description, completed, ... } }
});
```

### Emitting Events

```javascript
socket.emit("timer:start", { room_code: "ABC123" });
socket.emit("room:leave", { room_code, user_id });
socket.emit("task:add", { room_code, description, user_id });
```

## Proxy Configuration

Vite dev server proxies API requests to backend:

```
http://localhost:3000/api/* → http://localhost:3001/*
```

Configure in `vite.config.js` if backend port differs.

## Environment Variables (Future)

Create `.env.local`:

```
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=Virtual Café
```

Access via `import.meta.env.VITE_*`

## Performance Optimizations

- Code splitting via Vite (vendor chunks)
- Lazy loading for pages (future with React.lazy)
- Memoization for expensive renders (future)
- Socket.io event debouncing (future)

## Common Tasks

### Debug with Redux DevTools

(Future - currently using Context API)

### Add TypeScript

1. Rename files `.js` → `.ts` / `.jsx` → `.tsx`
2. Fix type errors
3. Configure `tsconfig.json`

### Integrate Tailwind CSS

1. `npm install -D tailwindcss postcss autoprefixer`
2. `npx tailwindcss init -p`
3. Import in `src/index.css`

## Troubleshooting

### Socket won't connect

- Check backend is running on port 3001
- Check browser console for CORS errors
- Verify Socket.io version matches backend

### API requests 404

- Check backend API routes
- Verify proxy config in `vite.config.js`
- Check Network tab in DevTools

### State not updating

- Ensure hooks are called at top level of component
- Check Context.Provider wraps all consumers
- Verify socket event listeners are registered

## Next Steps

1. Add TypeScript for type safety
2. Implement component library (Storybook)
3. Add integration tests (Vitest)
4. Implement error boundaries
5. Add analytics integration
6. Optimize bundle size

## Resources

- [React Docs](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [Socket.io Client](https://socket.io/docs/v4/client-api/)
- [Context API](https://react.dev/reference/react/useContext)
