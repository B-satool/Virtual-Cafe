import React, { useContext } from "react";
import { AuthPage } from "./AuthPage";
import { AuthContext } from "../contexts/AppContexts";

export const HomePage = () => {
  const auth = useContext(AuthContext);
  const [showAuth, setShowAuth] = React.useState(false);

  const handleShowLogin = () => {
    auth.setAuthPage("login");
    setShowAuth(true);
  };

  const handleShowSignup = () => {
    auth.setAuthPage("signup");
    setShowAuth(true);
  };

  if (showAuth) {
    return (
      <AuthPage
        onBack={() => setShowAuth(false)}
        login={auth.login}
        signup={auth.signup}
        loading={auth.loading}
        error={auth.error}
        clearError={auth.clearError}
        initialAuthPage={auth.authPage}
      />
    );
  }

  return (
    <div className="landing-page-hero">
      {/* Left side - 3D Model */}
      <div className="model-container">
        <iframe
          title="3D Café Model"
          frameBorder="0"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          src="https://sketchfab.com/models/365da75edfa743db9af0b0113ce762f2/embed"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "20px",
          }}
        ></iframe>
      </div>

      {/* Right side - Branding & Auth */}
      <div className="hero-card-container">
        <div className="hero-card">
          {/* Logo */}
          <div className="logo-section">
            <img
              src="/grindspace_logo.png"
              alt="Virtual Café Logo"
              className="logo-image"
              onError={(e) => {
                // Fallback if logo doesn't exist
                e.target.style.display = "none";
              }}
            />
          </div>

          {/* Tagline */}
          <div className="tagline-section">
            <h1 className="app-title">GrindSpace</h1>
            <p className="app-tagline">
              Collaborate. Study. Thrive Together.
            </p>
            <p className="app-description">
              Join a peaceful study space with friends. Break procrastination with shared Pomodoro sessions.
            </p>
          </div>

          {/* Auth Buttons */}
          <div className="auth-buttons">
            <button className="btn-login" onClick={handleShowLogin}>
              Log In
            </button>
            <button className="btn-signup" onClick={handleShowSignup}>
              Sign Up
            </button>
          </div>

          {/* Features Preview */}
          <div className="features-preview">
            <div className="feature">
              <span className="feature-icon">🎯</span>
              <span className="feature-text">Pomodoro Timer</span>
            </div>
            <div className="feature">
              <span className="feature-icon">👥</span>
              <span className="feature-text">Collaborate</span>
            </div>
            <div className="feature">
              <span className="feature-icon">💬</span>
              <span className="feature-text">Chat</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .landing-page-hero {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          align-items: center;
          justify-items: center;
          padding: 40px;
          background: linear-gradient(135deg, #f5e6d3 0%, #e8cdb3 100%);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .model-container {
          width: 100%;
          height: 700px;
          border-radius: 20px;
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          background: white;
        }

        .hero-card-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
        }

        .hero-card {
          background: white;
          border-radius: 20px;
          padding: 50px 40px;
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.12);
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 30px;
          text-align: center;
          animation: slideInRight 0.6s ease-out;
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .logo-section {
          display: flex;
          justify-content: center;
          padding: 20px 0;
        }

        .logo-image {
          max-width: 150px;
          height: auto;
          object-fit: contain;
        }

        .tagline-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .app-title {
          font-size: 2.5em;
          font-weight: 700;
          color: #5c4033;
          margin: 0;
        }

        .app-tagline {
          font-size: 1.1em;
          color: #8d6e63;
          font-weight: 600;
          margin: 0;
        }

        .app-description {
          font-size: 0.95em;
          color: #a1887f;
          line-height: 1.5;
          margin: 0;
        }

        .auth-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .btn-login,
        .btn-signup {
          padding: 14px 24px;
          font-size: 1em;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .btn-login {
          background: linear-gradient(135deg, #d4845c 0%, #c9703a 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(212, 132, 92, 0.3);
        }

        .btn-login:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(212, 132, 92, 0.4);
        }

        .btn-signup {
          background: white;
          color: #d4845c;
          border: 2px solid #d4845c;
          box-shadow: 0 4px 15px rgba(212, 132, 92, 0.15);
        }

        .btn-signup:hover {
          background: #fef9f6;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(212, 132, 92, 0.25);
        }

        .features-preview {
          display: flex;
          justify-content: space-around;
          padding-top: 20px;
          border-top: 1px solid #e0d5ce;
          gap: 10px;
        }

        .feature {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .feature-icon {
          font-size: 2em;
        }

        .feature-text {
          font-size: 0.8em;
          color: #8d6e63;
          font-weight: 500;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .landing-page-hero {
            grid-template-columns: 1fr;
            gap: 30px;
            padding: 20px;
          }

          .model-container {
            height: 500px;
          }

          .hero-card {
            padding: 40px 30px;
            max-width: 100%;
          }

          .app-title {
            font-size: 2em;
          }
        }

        @media (max-width: 768px) {
          .landing-page-hero {
            grid-template-columns: 1fr;
            gap: 20px;
            padding: 15px;
          }

          .model-container {
            height: 300px;
          }

          .hero-card {
            padding: 30px 20px;
            gap: 20px;
          }

          .app-title {
            font-size: 1.5em;
          }

          .auth-buttons {
            flex-direction: column;
          }

          .features-preview {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
