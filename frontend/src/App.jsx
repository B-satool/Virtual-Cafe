import React, { useEffect } from "react";
import { AuthContext, RoomContext, SocketContext } from "./contexts/AppContexts";
import { useAuth } from "./hooks/useAuth";
import { useRoom } from "./hooks/useRoom";
import { useSocket } from "./hooks/useSocket";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import RoomPage from "./pages/RoomPage";
import DashboardPage from "./pages/DashboardPage";
import "./App.css";

function AppContent() {
  const auth = React.useContext(AuthContext);
  const room = React.useContext(RoomContext);
  const socket = React.useContext(SocketContext);
  const [view, setView] = React.useState("main"); // "main" or "dashboard"

  const renderPage = () => {
    if (!auth.isAuthenticated && !auth.user) return <HomePage />;
    if (!auth.isAuthenticated) {
      return (
        <AuthPage
          login={auth.login}
          signup={auth.signup}
          loading={auth.loading}
          error={auth.error}
          clearError={auth.clearError}
          setAuthPage={auth.setAuthPage}
          initialAuthPage={auth.authPage}
        />
      );
    }
    
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

    if (view === "dashboard") {
      return (
        <DashboardPage
          currentUser={auth.user}
          onBack={() => setView("main")}
          logout={auth.logout}
        />
      );
    }

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
        onShowDashboard={() => setView("dashboard")}
      />
    );
  };

  return <div className="app">{renderPage()}</div>;
}

function App() {
  const authState = useAuth();
  const roomState = useRoom(authState.user?.id);
  const socketState = useSocket(
    authState.user?.id,
    roomState.currentRoom?.room_code,
    authState.user?.username,
  );

  useEffect(() => {
    if (authState.user?.id) {
      socketState.initializeSocket({
        onRoomState: (data) => {
          if (data.room) roomState.updateCurrentRoom(data.room);
          if (data.participants) roomState.updateParticipants(data.participants);
          if (data.timer) {
            roomState.updateRoomState({
              timerSeconds: data.timer.timeRemaining,
              totalTime: data.timer.totalTime,
              timerState: data.timer.mode,
              isRunning: data.timer.isRunning,
            });
          }
          if (data.config) {
            roomState.updateRoomState({
              studyDuration: data.config.studyDuration,
              breakDuration: data.config.breakDuration,
            });
          }
        },
        onTimerUpdate: (data) => {
          roomState.updateRoomState({
            timerSeconds: data.timeRemaining,
            totalTime: data.totalTime,
            timerState: data.mode,
            isRunning: data.isRunning,
          });
        },
        onTimerConfigured: (data) => {
          roomState.updateRoomState({
            timerSeconds: data.timer.timeRemaining,
            totalTime: data.timer.totalTime,
            studyDuration: data.studyDuration,
            breakDuration: data.breakDuration,
          });
        },
        onChatHistory: (data) => {
          roomState.updateRoomState({ chatMessages: data.messages || [] });
        },
        onChatMessage: (data) => {
          if (!data) return;
          roomState.setRoomState((prev) => {
            const messages = prev.chatMessages || [];
            // Check for optimistic duplicate
            const optimisticIndex = messages.findIndex(
              (m) => m && m.isOptimistic && (m.userId === data.userId || m.user_id === data.user_id) && m.message === data.message
            );

            if (optimisticIndex !== -1) {
              const newMessages = [...messages];
              newMessages[optimisticIndex] = { ...data, isOptimistic: false };
              return { ...prev, chatMessages: newMessages };
            }
            return { ...prev, chatMessages: [...messages, data] };
          });
        },
        onRoomClosed: () => roomState.leaveRoom(),
        onError: (data) => console.error("[Socket Error]", data.message),
      });
    }
    return () => socketState.disconnectSocket();
  }, [authState.user?.id, roomState.currentRoom?.room_code]);

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
