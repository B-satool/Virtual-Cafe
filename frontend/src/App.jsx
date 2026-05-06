import React, { useEffect, useState } from "react";
import {
  AuthContext,
  RoomContext,
  SocketContext,
} from "./contexts/AppContexts";
import { useAuth } from "./hooks/useAuth";
import { useRoom } from "./hooks/useRoom";
import { useSocket } from "./hooks/useSocket";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import RoomPage from "./pages/RoomPage";
import "./App.css";

function AppContent() {
  const auth = React.useContext(AuthContext);
  const room = React.useContext(RoomContext);
  const socket = React.useContext(SocketContext);

  // Determine which page to show
  const renderPage = () => {
    // First time visitor - show home page
    if (!auth.isAuthenticated && !auth.user) {
      return <HomePage />;
    }

    // Not authenticated - show auth page
    if (!auth.isAuthenticated) {
      return (
        <AuthPage
          login={auth.login}
          signup={auth.signup}
          loading={auth.loading}
          error={auth.error}
          clearError={auth.clearError}
          setAuthPage={auth.setAuthPage}
        />
      );
    }

    // In a room - show room page
    if (room.currentRoom) {
      return (
        <RoomPage
          currentRoom={room.currentRoom}
          currentUser={auth.user}
          participants={room.participants}
          roomState={room.roomState}
          leaveRoom={room.leaveRoom}
          updateRoomState={room.updateRoomState}
          socket={socket.socket}
          emitEvent={socket.emitEvent}
        />
      );
    }

    // Authenticated but not in a room - show landing page
    return (
      <LandingPage
        rooms={room.rooms}
        loadPublicRooms={room.loadPublicRooms}
        createRoom={room.createRoom}
        joinRoom={room.joinRoom}
        currentUser={auth.user}
        loading={room.loading}
        error={room.error}
        logout={auth.logout}
      />
    );
  };

  return <div className="app">{renderPage()}</div>;
}

function App() {
  // Initialize hooks
  const authState = useAuth();
  const roomState = useRoom(authState.user?.id);
  const socketState = useSocket(
    authState.user?.id,
    roomState.currentRoom?.room_code,
    authState.user?.username,
  );

  // Initialize socket with event handlers
  useEffect(() => {
    if (authState.user?.id) {
      socketState.initializeSocket({
        onParticipantJoined: (data) => {
          // room:state broadcast handles full participant list updates,
          // so this is just for diagnostic logging
          console.log("[App] participant:joined event:", data);
        },
        onParticipantLeft: (data) => {
          console.log("[App] participant:left event:", data);
        },
        onParticipantsUpdate: (data) => {
          console.log("[App] onParticipantsUpdate called with data:", data);
          if (data.room) {
            roomState.updateCurrentRoom(data.room);
          }
          if (data.participants) {
            roomState.updateParticipants(data.participants);
          }
        },
        onRoomClosed: () => {
          roomState.leaveRoom();
        },
        onTimerTick: (data) => {
          roomState.updateRoomState({ timerSeconds: data.seconds });
        },
        onTimerTransition: (data) => {
          roomState.updateRoomState({
            timerState: data.newState,
            timerSeconds: data.seconds,
          });
        },
        onTaskAdded: (data) => {
          // Task update will be handled in RoomPage
        },
        onTaskUpdated: (data) => {
          // Task update will be handled in RoomPage
        },
        onTaskDeleted: (data) => {
          // Task update will be handled in RoomPage
        },
      });
    }

    return () => {
      socketState.disconnectSocket();
    };
  }, [authState.user?.id]);

  // CRITICAL: Emit room:join when room code changes or socket reconnects.
  // Without this, creating/joining a room via REST never tells the socket
  // to join, so room:state is never received and participants/isHost stay empty.
  useEffect(() => {
    const roomCode = roomState.currentRoom?.room_code;
    if (roomCode && authState.user?.id && socketState.isConnected) {
      console.log(
        `[App] Room code available & socket connected — emitting room:join for ${roomCode}`,
      );
      socketState.emitEvent("room:join", {
        roomCode: roomCode,
        userId: authState.user.id,
        username: authState.user.username || "",
      });
    }
  }, [
    roomState.currentRoom?.room_code,
    socketState.isConnected,
    authState.user?.id,
    authState.user?.username,
  ]);

  return (
    <AuthContext.Provider value={authState}>
      <RoomContext.Provider value={roomState}>
        <SocketContext.Provider value={socketState}>
          <AppContent />
        </SocketContext.Provider>
      </RoomContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;
