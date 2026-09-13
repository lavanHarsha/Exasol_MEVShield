import React, { useState, useEffect } from 'react';

const TechnicalDetails = () => {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModelInfo = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/health');
        if (response.ok) {
          const data = await response.json();
          setModelInfo(data);
        }
      } catch (error) {
        console.error('Error fetching model info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModelInfo();
  }, []);

  return (
    <section className="tech-specs-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <h2 className="panel-title">SYSTEM ARCHITECTURE & BENCHMARK AUDIT</h2>
          <span className="spec-tag">EXASOL IN-MEMORY ML ENGINE</span>
        </div>
        <span className="spec-version">Model Build: champion_mev_v1</span>
      </div>

      <div className="specs-grid">
        <div className="spec-card">
          <span className="spec-meta-label">CHAMPION MODEL</span>
          <span className="spec-meta-value highlight">{modelInfo?.model_name || 'XGBoost'}</span>
          <span className="spec-sub">CUDA GPU-Accelerated</span>
        </div>

        <div className="spec-card">
          <span className="spec-meta-label">DECISION THRESHOLD</span>
          <span className="spec-meta-value">{modelInfo?.threshold ?? 0.86}</span>
          <span className="spec-sub">Cost-Sensitive Boundary</span>
        </div>

        <div className="spec-card">
          <span className="spec-meta-label">PR-AUC BENCHMARK</span>
          <span className="spec-meta-value success-text">0.8591</span>
          <span className="spec-sub">Evaluated on 16.17:1 Imbalance</span>
        </div>

        <div className="spec-card">
          <span className="spec-meta-label">ROC-AUC BENCHMARK</span>
          <span className="spec-meta-value success-text">0.9660</span>
          <span className="spec-sub">High Discrimination Index</span>
        </div>

        <div className="spec-card">
          <span className="spec-meta-label">MODEL PRECISION</span>
          <span className="spec-meta-value highlight">90.09%</span>
          <span className="spec-sub">Minimizes False Alarms</span>
        </div>

        <div className="spec-card">
          <span className="spec-meta-label">IN-MEMORY SCORING</span>
          <span className="spec-meta-value">&gt;160,000 tx/s</span>
          <span className="spec-sub">0.062s per 10K batch</span>
        </div>

        <div className="spec-card">
          <span className="spec-meta-label">TRAINING CORPUS</span>
          <span className="spec-meta-value">2,444,471</span>
          <span className="spec-sub">Chronological Block Split (72%)</span>
        </div>

        <div className="spec-card">
          <span className="spec-meta-label">TEST CORPUS</span>
          <span className="spec-meta-value">611,106</span>
          <span className="spec-sub">Unseen Verification (18%)</span>
        </div>
      </div>
    </section>
  );
};

export default TechnicalDetails;
