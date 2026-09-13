import React, { useState, useEffect } from 'react';
import { getStatus, startStream, pauseStream, resetStream } from '../api/api';

const Controls = () => {
  const [status, setStatus] = useState('STOPPED');
  const [speed, setSpeed] = useState('1x');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await getStatus();
        if (res && res.status) {
          setStatus(res.status);
        }
      } catch (error) {
        console.error('Failed to fetch status:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    await startStream();
    setStatus('RUNNING');
  };

  const handlePause = async () => {
    await pauseStream();
    setStatus('PAUSED');
  };

  const handleReset = async () => {
    await resetStream();
    setStatus('STOPPED');
  };

  return (
    <section className="controls-bar">
      <div className="controls-left">
        <div className="stream-status-tag">
          <span className="stream-status-label">STREAM STATUS:</span>
          <span className={`stream-badge status-${status.toLowerCase()}`}>
            <span className="pulse-circle"></span>
            {status}
          </span>
        </div>

        <div className="control-action-buttons">
          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={status === 'RUNNING'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            START STREAM
          </button>
          <button
            className="btn btn-secondary"
            onClick={handlePause}
            disabled={status !== 'RUNNING'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            PAUSE
          </button>
          <button
            className="btn btn-ghost"
            onClick={handleReset}
            disabled={status === 'STOPPED'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            RESET
          </button>
        </div>
      </div>

      <div className="controls-right">
        <span className="speed-label">Replay Rate:</span>
        <div className="speed-pills">
          {['1x', '2x', '5x'].map((s) => (
            <button
              key={s}
              type="button"
              className={`speed-pill ${speed === s ? 'active' : ''}`}
              onClick={() => setSpeed(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Controls;
