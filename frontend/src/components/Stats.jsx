import React, { useState, useEffect } from 'react';
import { getStatus, getStatistics } from '../api/api';

const Stats = () => {
  const [stats, setStats] = useState({
    total_scanned: 0,
    high_risk: 0,
    normal: 0,
    attack_rate: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await getStatistics();
        if (statsRes) {
          setStats(statsRes);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="stats-grid">
      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-label">TRANSACTIONS ANALYZED</span>
          <span className="stat-icon blue">⚡</span>
        </div>
        <div className="stat-value">{stats.total_scanned.toLocaleString()}</div>
        <div className="stat-subtext">Holdout mempool replay stream</div>
      </div>

      <div className="stat-card danger-card">
        <div className="stat-card-header">
          <span className="stat-label">SANDWICH ATTACKS DETECTED</span>
          <span className="stat-icon red">🚨</span>
        </div>
        <div className="stat-value danger-text">{stats.high_risk.toLocaleString()}</div>
        <div className="stat-subtext">Optimal Threshold: ≥ 0.8600</div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-label">LEGITIMATE TRANSACTIONS</span>
          <span className="stat-icon green">✓</span>
        </div>
        <div className="stat-value success-text">{stats.normal.toLocaleString()}</div>
        <div className="stat-subtext">Zero slippage penalty</div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-label">STREAM ATTACK DENSITY</span>
          <span className="stat-icon purple">📊</span>
        </div>
        <div className="stat-value">{stats.attack_rate.toFixed(2)}%</div>
        <div className="stat-meter-container">
          <div
            className="stat-meter-fill"
            style={{ width: `${Math.min(stats.attack_rate * 4, 100)}%` }}
          ></div>
        </div>
      </div>
    </section>
  );
};

export default Stats;
