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

  const modelId = "365da75edfa743db9af0b0113ce762f2";

  return (
    <div className="auth-page">
      {/* Left Section - 3D Model */}
      <div className="auth-visual-section">
        <div className="sketchfab-embed-wrapper">
          <iframe
            title="Sketchfab 3D Model"
            src={`https://sketchfab.com/models/${modelId}/embed?autostart=1&camera=0&preload=1&transparent=1&ui_animations=0&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark=0&ui_hint=0&ui_ar=0&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0`}
            frameBorder="0"
            allowFullScreen
            mozallowfullscreen="true"
            webkitallowfullscreen="true"
            allow="autoplay; fullscreen; xr-spatial-tracking"
          ></iframe>
        </div>
        <div className="visual-overlay">
          <div className="brand-badge">Virtual Café</div>
          <div className="visual-content">
            <h1>Experience the future of social coworking</h1>
            <p>Step into a space designed for productivity and connection.</p>
          </div>
        </div>
      </div>

      {/* Right Section - Auth Form */}
      <div className="auth-form-section">
        <div className="auth-form-container">
          <div className="auth-header">
            <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
            <p>{isLogin ? "Enter your credentials to access your café." : "Sign up to start your journey with us."}</p>
          </div>

          {(error || localError) && (
            <div className="error-message">
              <span>{error || localError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="premium-form">
            <div className="form-group">
              <label htmlFor="email">{isLogin ? "Email or Username" : "Email"}</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type={isLogin ? "text" : "email"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isLogin ? "your@email.com or username" : "your@email.com"}
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <div className="input-wrapper">
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your unique handle"
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? (
                <div className="loader"></div>
              ) : (
                <span>{isLogin ? "Login" : "Sign Up"}</span>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              {isLogin
                ? "New here? "
                : "Already a member? "}
              <button onClick={toggleMode} className="btn-toggle">
                {isLogin ? "Join Now" : "Sign In"}
              </button>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        :root {
          --primary: #d4a373;
          --primary-hover: #bc8a5f;
          --bg-dark: #1a1a1a;
          --text-main: #333;
          --text-muted: #666;
          --error: #e63946;
          --glass: rgba(255, 255, 255, 0.8);
          --shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        }

        .auth-page {
          display: flex;
          min-height: 100vh;
          width: 100%;
          background: #fff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          overflow: hidden;
        }

        /* Visual Section */
        .auth-visual-section {
          flex: 1.2;
          position: relative;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        @media (max-width: 900px) {
          .auth-visual-section {
            display: none;
          }
        }

        .sketchfab-embed-wrapper {
          width: 100%;
          height: 100%;
        }

        .sketchfab-embed-wrapper iframe {
          width: 100%;
          height: 100%;
          border: none;
        }

        .visual-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 50%);
          pointer-events: none;
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }

        .brand-badge {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          color: #fff;
          padding: 8px 16px;
          border-radius: 20px;
          width: fit-content;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .visual-content {
          color: #fff;
          max-width: 500px;
        }

        .visual-content h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
          line-height: 1.1;
        }

        .visual-content p {
          font-size: 1.1rem;
          opacity: 0.9;
        }

        /* Form Section */
        .auth-form-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: #fdfcfb;
          position: relative;
        }

        .auth-form-container {
          width: 100%;
          max-width: 420px;
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .auth-header {
          margin-bottom: 40px;
        }

        .auth-header h2 {
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--text-main);
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }

        .auth-header p {
          color: var(--text-muted);
          font-size: 1rem;
        }

        .error-message {
          background: #fff0f0;
          color: var(--error);
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-size: 0.9rem;
          font-weight: 500;
          border: 1px solid rgba(230, 57, 70, 0.1);
        }

        .premium-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .input-wrapper {
          position: relative;
        }

        .input-wrapper input {
          width: 100%;
          padding: 14px 18px;
          background: #fff;
          border: 1.5px solid #eee;
          border-radius: 14px;
          font-size: 1rem;
          color: var(--text-main);
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .input-wrapper input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(212, 163, 115, 0.1);
        }

        .btn-submit {
          margin-top: 10px;
          padding: 16px;
          background: var(--primary);
          color: #fff;
          border: none;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 20px -5px rgba(212, 163, 115, 0.4);
        }

        .btn-submit:hover:not(:disabled) {
          background: var(--primary-hover);
          transform: translateY(-2px);
          box-shadow: 0 15px 25px -5px rgba(212, 163, 115, 0.5);
        }

        .btn-submit:active {
          transform: translateY(0);
        }

        .btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-toggle {
          background: none;
          border: none;
          color: var(--primary);
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          font-size: inherit;
          margin-left: 4px;
          transition: color 0.2s;
        }

        .btn-toggle:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }

        .auth-footer {
          margin-top: 32px;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.95rem;
        }

        .loader {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AuthPage;
