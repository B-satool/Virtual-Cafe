import React from "react";

export const HomePage = ({ onGetStarted }) => {
  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>Welcome to Virtual Café ☕</h1>
        <p className="subtitle">Study together, stay focused with Pomodoro</p>

        <div className="hero-content">
          <div className="hero-text">
            <h2>Get Focused. Get Productive. Together.</h2>
            <p>
              Virtual Café brings the ambient energy of a coffee shop to your
              study sessions. Work alongside peers using the Pomodoro technique
              while enjoying calming background sounds.
            </p>

            <div className="features-highlight">
              <div className="feature">
                <span className="icon">⏱️</span>
                <h3>Pomodoro Timer</h3>
                <p>25-minute focused study sessions with 5-minute breaks</p>
              </div>
              <div className="feature">
                <span className="icon">👥</span>
                <h3>Study Together</h3>
                <p>Real-time collaboration with accountability partners</p>
              </div>
              <div className="feature">
                <span className="icon">🎵</span>
                <h3>Ambient Sounds</h3>
                <p>Calming coffee shop and nature soundscapes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="cta-button">
          <button onClick={onGetStarted} className="btn btn-primary btn-large">Get Started</button>
        </div>
      </div>

      <style>{`
        .home-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .hero-section {
          max-width: 900px;
          text-align: center;
        }

        .hero-section h1 {
          font-size: 3.5rem;
          margin-bottom: 10px;
          font-weight: bold;
        }

        .subtitle {
          font-size: 1.3rem;
          opacity: 0.95;
          margin-bottom: 50px;
        }

        .hero-text h2 {
          font-size: 2rem;
          margin-bottom: 20px;
          line-height: 1.4;
        }

        .hero-text p {
          font-size: 1.1rem;
          opacity: 0.9;
          margin-bottom: 40px;
          line-height: 1.6;
        }

        .features-highlight {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px;
          margin: 40px 0;
          text-align: center;
        }

        .feature {
          background: rgba(255, 255, 255, 0.1);
          padding: 30px;
          border-radius: 10px;
          backdrop-filter: blur(10px);
        }

        .feature .icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 15px;
        }

        .feature h3 {
          font-size: 1.3rem;
          margin-bottom: 10px;
        }

        .feature p {
          opacity: 0.8;
          font-size: 0.95rem;
        }

        .cta-button {
          margin-top: 50px;
        }

        .btn {
          padding: 12px 30px;
          border: none;
          border-radius: 5px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: white;
          color: #667eea;
          font-weight: bold;
        }

        .btn-large {
          padding: 15px 50px;
          font-size: 1.1rem;
        }

        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default HomePage;
