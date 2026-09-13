import React, { useState, useEffect } from 'react';
import { getTransactions } from '../api/api';

const TransactionTable = ({ onTransactionSelect, selectedTxHash }) => {
  const [transactions, setTransactions] = useState([]);
  const [activeHash, setActiveHash] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const data = await getTransactions();
        if (Array.isArray(data)) {
          setTransactions(data);
          // Auto-select the first transaction if none selected yet
          if (data.length > 0 && !activeHash) {
            setActiveHash(data[0].tx_hash);
            if (onTransactionSelect) {
              onTransactionSelect(data[0]);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      }
    };

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 1000);
    return () => clearInterval(interval);
  }, [activeHash, onTransactionSelect]);

  const handleRowClick = (tx) => {
    setActiveHash(tx.tx_hash);
    if (onTransactionSelect) {
      onTransactionSelect(tx);
    }
  };

  return (
    <section className="transaction-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <h2 className="panel-title">LIVE TRANSACTION STREAM</h2>
          <span className="tx-count-pill">{transactions.length} Captured</span>
        </div>
        <span className="stream-sync-badge">
          <span className="pulse-dot"></span> Ingestion Active
        </span>
      </div>

      <div className="table-scroll-container">
        <table className="tx-table">
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Block</th>
              <th style={{ width: '38%' }}>Transaction Hash</th>
              <th style={{ width: '20%' }}>Risk Score</th>
              <th style={{ width: '20%' }}>Classification</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-table-cell">
                  <div className="empty-table-state">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <p>Stream paused. Click <strong>▶ START STREAM</strong> above to begin live inference.</p>
                  </div>
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isSelected = activeHash === tx.tx_hash;
                const isHighRisk = tx.risk_level === 'HIGH';
                return (
                  <tr
                    key={tx.tx_hash}
                    className={`tx-row ${isHighRisk ? 'is-high-risk' : 'is-normal'} ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleRowClick(tx)}
                  >
                    <td className="cell-block">
                      #{tx.block_number.toLocaleString()}
                    </td>
                    <td className="cell-hash">
                      <span className="hash-mono">
                        {tx.tx_hash.slice(0, 8)}...{tx.tx_hash.slice(-6)}
                      </span>
                    </td>
                    <td className="cell-score">
                      <span className={`score-badge ${isHighRisk ? 'score-high' : 'score-normal'}`}>
                        {(tx.risk_score * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="cell-status">
                      <span className={`status-pill-small ${isHighRisk ? 'badge-danger' : 'badge-safe'}`}>
                        {isHighRisk ? 'MEV SANDWICH' : 'LEGITIMATE'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default TransactionTable;
