import React from "react";

export const AuthContext = React.createContext({
  isAuthenticated: false,
  user: null,
  authPage: "login",
  loading: false,
  error: null,
  login: () => {},
  signup: () => {},
  logout: () => {},
  clearError: () => {},
});

export const RoomContext = React.createContext({
  currentRoom: null,
  rooms: [],
  currentUser: null,
  participants: [],
  roomState: {},
  joinRoom: () => {},
  leaveRoom: () => {},
  createRoom: () => {},
});

export const SocketContext = React.createContext({
  socket: null,
  isConnected: false,
  socketError: null,
});

export const NotificationContext = React.createContext({
  notification: null,
  showNotification: () => {},
  hideNotification: () => {},
});
