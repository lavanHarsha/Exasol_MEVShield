import React, { useState, useEffect } from 'react';

const Header = () => {
  const [apiConnected, setApiConnected] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [exasolConnected, setExasolConnected] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/health');
        if (response.ok) {
          const data = await response.json();
          setApiConnected(true);
          setModelLoaded(Boolean(data.model_loaded));
          setExasolConnected(true);
        } else {
          setApiConnected(false);
          setModelLoaded(false);
          setExasolConnected(false);
        }
      } catch (error) {
        setApiConnected(false);
        setModelLoaded(false);
        setExasolConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-brand">
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <div className="brand-title-row">
              <span className="brand-title">EXASOL MEVSHIELD</span>
              <span className="brand-tag">IN-MEMORY ML DEFENSE</span>
            </div>
            <p className="brand-subtitle">Real-Time Sandwich Attack Detection & Exploitation Mitigation</p>
          </div>
        </div>

        <div className="header-indicators">
          <div className={`status-pill ${apiConnected ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            <span className="status-label">API Gateway</span>
          </div>
          <div className={`status-pill ${exasolConnected ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            <span className="status-label">Exasol Engine</span>
          </div>
          <div className={`status-pill ${modelLoaded ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            <span className="status-label">XGBoost Core</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
