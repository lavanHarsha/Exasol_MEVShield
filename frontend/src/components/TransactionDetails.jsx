import React, { useState } from 'react';

const TransactionDetails = ({ transaction }) => {
  const [copied, setCopied] = useState(false);

  if (!transaction) {
    return (
      <section className="details-panel empty-details">
        <div className="empty-details-content">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <h3>TELEMETRY INSPECTOR</h3>
          <p>Click any transaction row from the live stream to inspect its in-database features and model decision boundary.</p>
        </div>
      </section>
    );
  }

  const { features = [], risk_score = 0, risk_level = 'NORMAL' } = transaction;
  const isHighRisk = risk_level === 'HIGH';

  const featureNames = [
    "LOG_VALUE_ETH", "LOG_AMOUNT_USD", "LOG_PREVIOUS_USD", "LOG_NEXT_USD",
    "LOG_GAS_PRICE", "LOG_PRIORITY_FEE", "VALUE_ETH", "AMOUNT_USD",
    "GAS_USED", "GAS_PRICE_WEI", "PRIORITY_FEE_WEI", "INPUT_SIZE_BYTES",
    "POOL_TRADES_IN_BLOCK", "HAS_PREV_TRADE", "HAS_NEXT_TRADE",
    "IS_ISOLATED_POOL_TRADE", "PREVIOUS_GAP", "NEXT_GAP",
    "PRIORITY_FEE_RATIO_PREV", "USD_RATIO_PREV", "PREVIOUS_INPUT_SIZE", "NEXT_INPUT_SIZE"
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(transaction.tx_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const scorePercent = (risk_score * 100).toFixed(1);

  return (
    <section className="details-panel">
      <div className="panel-header">
        <h2 className="panel-title">TRANSACTION TELEMETRY INSPECTOR</h2>
        <span className={`status-pill-small ${isHighRisk ? 'badge-danger' : 'badge-safe'}`}>
          {isHighRisk ? 'MEV SANDWICH DETECTED' : 'LEGITIMATE TRADE'}
        </span>
      </div>

      {/* Transaction Summary Card */}
      <div className="tx-summary-card">
        <div className="tx-hash-row">
          <div className="tx-hash-wrapper">
            <span className="tx-hash-label">TX HASH:</span>
            <span className="tx-hash-full">{transaction.tx_hash}</span>
          </div>
          <button className="copy-btn" onClick={handleCopy} title="Copy full transaction hash">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <div className="tx-meta-grid">
          <div className="meta-box">
            <span className="meta-label">BLOCK NUMBER</span>
            <span className="meta-value">#{transaction.block_number.toLocaleString()}</span>
          </div>
          <div className="meta-box">
            <span className="meta-label">TRANSACTION INDEX</span>
            <span className="meta-value">#{transaction.transaction_index}</span>
          </div>
          <div className="meta-box">
            <span className="meta-label">RISK PROBABILITY</span>
            <span className={`meta-value ${isHighRisk ? 'danger-text' : 'success-text'}`}>
              {scorePercent}%
            </span>
          </div>
          <div className="meta-box">
            <span className="meta-label">MITIGATION ACTION</span>
            <span className="meta-value action-value">
              {isHighRisk ? 'Slippage Shield Triggered' : 'Direct Pass-Through'}
            </span>
          </div>
        </div>

        {/* Risk Probability Meter */}
        <div className="risk-meter-wrapper">
          <div className="risk-meter-labels">
            <span>Model Score: {risk_score.toFixed(4)}</span>
            <span>Threshold: 0.8600</span>
          </div>
          <div className="risk-bar-track">
            <div
              className={`risk-bar-fill ${isHighRisk ? 'fill-danger' : 'fill-normal'}`}
              style={{ width: `${Math.min(risk_score * 100, 100)}%` }}
            ></div>
            <div className="threshold-marker" style={{ left: '86%' }} title="Decision Threshold (0.8600)"></div>
          </div>
        </div>
      </div>

      {/* Feature Telemetry Grid */}
      <div className="features-section">
        <h3 className="features-title">Extracted In-Database Features (Exasol Columnar)</h3>
        <div className="features-scroll-window">
          <div className="features-table-grid">
            {featureNames.map((name, i) => {
              const val = features[i] !== undefined ? features[i] : null;
              const formattedVal = typeof val === 'number'
                ? (Number.isInteger(val) ? val.toLocaleString() : val.toFixed(4))
                : (val ?? 'N/A');
              return (
                <div key={name} className="feature-item">
                  <span className="feature-key">{name}</span>
                  <span className="feature-val">{formattedVal}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TransactionDetails;
