# Virtual Café ☕

A collaborative study room application featuring real-time Pomodoro timers, shared task lists, and ambient study sounds. Designed for students and remote workers to stay productive together.

## 🚀 Getting Started

Follow these instructions to set up the project locally on your machine.

### Prerequisites

- **Node.js**: Version 16.x or higher
- **npm**: Version 8.x or higher
- **Supabase Account**: A free account at [supabase.com](https://supabase.com)

---

## 🛠️ Setup Instructions

### 1. Database Setup (Supabase)

1. Create a new project in your [Supabase Dashboard](https://app.supabase.com/).
2. Once the project is ready, navigate to the **SQL Editor** in the left sidebar.
3. Click **New Query** and paste the entire contents of the `schema.sql` file located in the root of this project.
4. Click **Run**. This will create all necessary tables, indexes, and triggers.

### 2. Environment Configuration

1. In the root directory of this project, create a file named `.env`.
2. Populate it with your Supabase credentials found in **Project Settings > API**:
   ```env
   SUPABASE_URL=your_project_url_here
   SUPABASE_KEY=your_anon_public_key_here
   PORT=3001
   ```
   *Note: For the graders, a pre-configured `.env` file should be provided separately.*

### 3. Backend Installation & Start

1. Open a terminal in the project's root directory.
2. Install the backend dependencies:
   ```bash
   npm install
   ```
3. Start the backend server:
   ```bash
   npm start
   ```
   The server will run on `http://localhost:3001`. You should see a message: `[PORT] Virtual Café server running on port 3001`.
   *Note: If port 3001 is busy, the server will automatically try the next available port (3002, 3003, etc.).*

---

## 🛠️ Architecture Overview

The **Virtual Café** uses a modern, real-time architecture:

1. **State Management**: React 18 with custom hooks (`useRoom`, `useSocket`, `useAuth`) manages the application state.
2. **Real-time Sync**: Socket.io ensures that all participants in a room see the same timer state, task list, and participant updates instantly.
3. **Persisted Data**: Supabase (PostgreSQL) stores user profiles, room configurations, and persistent session logs.
4. **Backend**: Express handles the REST API for auth and initial room data, while Socket.io handlers manage the live interactions.

## 📂 Project Structure

- `/` (Root): Express.js backend server and Socket.io handlers.
- `/src`: Backend database logic and socket event controllers.
- `/frontend`: React application built with Vite.
- `/frontend/src/pages`: Main application views (Home, Auth, Room, etc.).
- `/frontend/src/hooks`: Custom React hooks for Auth, Room, and Socket logic.
- `schema.sql`: Database schema for Supabase/PostgreSQL.

---

## ✨ Features

- **Real-time Collaboration**: Multi-user study rooms with live participant tracking via Socket.io.
- **Shared Pomodoro Timer**: A server-authoritative timer that stays in sync for everyone in the room.
- **Ambient Sounds**: Integrated soundscapes (Rain, Cafe, Fireplace) with individual volume controls.
- **Task Management**: Shared todo list for each room where participants can track goals.
- **Host Management**: Room creators can manage timer states and room settings.
- **Authentication**: Secure login and signup powered by Supabase Auth.

---

## 🔧 Technologies Used

- **Frontend**: React 18, Vite, Socket.io-client, CSS3.
- **Backend**: Node.js, Express, Socket.io.
- **Database**: Supabase (PostgreSQL), GoTrue (Auth).
- **Styling**: Vanilla CSS with modern responsive design.

---

## 📝 Note for Graders

The application relies on a live Supabase instance. Please ensure the `.env` file provided has valid `SUPABASE_URL` and `SUPABASE_KEY` values for the backend to communicate with the database.
