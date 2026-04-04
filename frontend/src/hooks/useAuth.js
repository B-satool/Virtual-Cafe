import { useState, useCallback } from "react";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem("userToken");
  });
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("userId");
    const username = localStorage.getItem("username");
    return stored ? { id: stored, username } : null;
  });
  const [authPage, setAuthPage] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

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

  const signup = useCallback(async (email, password, username) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");

      localStorage.setItem("userToken", data.token);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("username", username);

      setUser({ id: data.userId, username });
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    localStorage.removeItem("currentRoom");
    localStorage.removeItem("currentUsername");
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    isAuthenticated,
    user,
    authPage,
    loading,
    error,
    login,
    signup,
    logout,
    clearError,
    setAuthPage,
  };
};
