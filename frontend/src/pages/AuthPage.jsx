import React, { useState } from "react";

export const AuthPage = ({
  login,
  signup,
  loading,
  error,
  clearError,
  setAuthPage,
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    clearError();

    if (!email || !password || (!isLogin && !username)) {
      setLocalError("Please fill in all fields");
      return;
    }

    const success = isLogin
      ? await login(email, password)
      : await signup(email, password, username);

    if (!success) {
      setLocalError(error || "Authentication failed");
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setLocalError("");
    clearError();
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-box">
          <h1>☕ Virtual Café</h1>
          <h2>{isLogin ? "Welcome Back" : "Join Us"}</h2>

          {(error || localError) && (
            <div className="error-message">{error || localError}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Loading..." : isLogin ? "Login" : "Sign Up"}
            </button>
          </form>

          <div className="auth-toggle">
            <p>
              {isLogin
                ? "Don't have an account? "
                : "Already have an account? "}
              <button onClick={toggleMode} className="toggle-btn">
                {isLogin ? "Sign Up" : "Login"}
              </button>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .auth-container {
          width: 100%;
          max-width: 400px;
        }

        .auth-box {
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .auth-box h1 {
          font-size: 2rem;
          margin-bottom: 10px;
          text-align: center;
          color: #333;
        }

        .auth-box h2 {
          font-size: 1.3rem;
          margin-bottom: 30px;
          text-align: center;
          color: #666;
          font-weight: 600;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 10px 15px;
          border-radius: 5px;
          margin-bottom: 20px;
          font-size: 0.9rem;
          border-left: 4px solid #c33;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #333;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .form-group input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 5px;
          font-size: 1rem;
          transition: border-color 0.3s;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .btn {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 5px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-toggle {
          margin-top: 20px;
          text-align: center;
        }

        .auth-toggle p {
          color: #666;
          font-size: 0.95rem;
        }

        .toggle-btn {
          background: none;
          border: none;
          color: #667eea;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          padding: 0;
          font-size: inherit;
        }

        .toggle-btn:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default AuthPage;
