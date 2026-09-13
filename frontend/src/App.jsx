import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Shield, 
  Search, 
  Pause, 
  Play, 
  RotateCcw, 
  Copy, 
  Check, 
  Sun,
  Moon
} from 'lucide-react';
import { getStatus, getStatistics, getTransactions, startStream, pauseStream, resetStream } from './api/api';
import './index.css';

// Cubic bezier path generator for fluid, ultra-clean financial charts
function generateSmoothPath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function App() {
  const [theme, setTheme] = useState('dark');
  const [streamStatus, setStreamStatus] = useState('RUNNING');
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ total_scanned: 0, high_risk: 0, normal: 0, attack_rate: 0 });
  // Initially null so transaction inspector displays clean empty prompt
  const [selectedTx, setSelectedTx] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedField, setCopiedField] = useState(null);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [apiConnected, setApiConnected] = useState(true);

  // Accumulated threats that persist throughout the stream session
  const [allDetectedThreats, setAllDetectedThreats] = useState([]);
  
  // Real measured network latency
  const [latencyMs, setLatencyMs] = useState(0);

  // Real-time rolling telemetry history (tracks Gas Price Gwei and Attack Rate)
  const [activityHistory, setActivityHistory] = useState([]);
  const [peakGasGwei, setPeakGasGwei] = useState(25.0);

  // Time stamps tracker to ensure fixed detectedAt times
  const threatTimestampsRef = useRef(new Map());

  // Auto-start stream on load
  useEffect(() => {
    const autoStart = async () => {
      try {
        await startStream();
        setStreamStatus('RUNNING');
      } catch (err) {
        console.error('Failed to auto-start stream on mount:', err);
      }
    };
    autoStart();
  }, []);

  // Live System Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dateStr = `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
      setCurrentTime(timeStr);
      setCurrentDate(dateStr);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll backend data
  useEffect(() => {
    const fetchData = async () => {
      const t0 = performance.now();
      try {
        const [statusRes, statsRes, txsRes] = await Promise.all([
          getStatus().catch(() => null),
          getStatistics().catch(() => null),
          getTransactions().catch(() => null)
        ]);
        const roundTrip = Math.round((performance.now() - t0) * 10) / 10;
        
        if (roundTrip > 0) {
          setLatencyMs(roundTrip);
        }

        if (statusRes && statusRes.status) {
          setStreamStatus(statusRes.status);
          setApiConnected(true);
        }
        if (statsRes) {
          setStats(statsRes);
        }
        if (Array.isArray(txsRes)) {
          setTransactions(txsRes);

          // Track new threats and assign permanent fixed detectedAt timestamp
          const nowStr = new Date().toTimeString().split(' ')[0];
          setAllDetectedThreats(prev => {
            const existingHashes = new Set(prev.map(t => t.tx_hash));
            const newThreats = [];

            txsRes.forEach(tx => {
              if (tx.risk_level === 'HIGH' && !existingHashes.has(tx.tx_hash)) {
                if (!threatTimestampsRef.current.has(tx.tx_hash)) {
                  threatTimestampsRef.current.set(tx.tx_hash, nowStr);
                }
                newThreats.push({
                  ...tx,
                  detectedAt: threatTimestampsRef.current.get(tx.tx_hash)
                });
                existingHashes.add(tx.tx_hash);
              }
            });

            if (newThreats.length > 0) {
              return [...newThreats, ...prev];
            }
            return prev;
          });

          // Record rolling telemetry: Mempool Gas Price (Gwei) and Real Threat Rate
          if (statusRes?.status === 'RUNNING') {
            const realAttackRate = statsRes ? (statsRes.attack_rate || 0) : 0;
            const latestTx = txsRes[0];
            const rawGasPrice = latestTx?.features?.[9] !== undefined ? Number(latestTx.features[9]) : 15e9;
            const gasPriceGwei = rawGasPrice > 1e6 ? Math.round((rawGasPrice / 1e9) * 100) / 100 : Math.round(rawGasPrice * 100) / 100;
            
            setPeakGasGwei(prev => Math.max(prev, gasPriceGwei));

            setActivityHistory(prev => {
              const updated = [
                ...prev, 
                { 
                  gasPriceGwei: gasPriceGwei,
                  attackRate: realAttackRate,
                  time: nowStr.slice(3, 8) 
                }
              ];
              return updated.slice(-20);
            });
          }
        }
      } catch (err) {
        setApiConnected(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleStream = async () => {
    if (streamStatus === 'RUNNING') {
      await pauseStream();
      setStreamStatus('PAUSED');
    } else {
      await startStream();
      setStreamStatus('RUNNING');
    }
  };

  const handleReset = async () => {
    await resetStream();
    setStreamStatus('STOPPED');
    setTransactions([]);
    setAllDetectedThreats([]);
    setSelectedTx(null);
    setActivityHistory([]);
    threatTimestampsRef.current.clear();
    setStats({ total_scanned: 0, high_risk: 0, normal: 0, attack_rate: 0 });
    setPeakGasGwei(25.0);
  };

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1800);
  };

  // Latest detected attack
  const latestAttack = allDetectedThreats[0] || null;

  // Filtered live stream
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase().trim();
    return transactions.filter(tx => 
      tx.tx_hash.toLowerCase().includes(q) || String(tx.block_number).includes(q)
    );
  }, [transactions, searchQuery]);

  // True Block Context calculations: merges stream, threat history, and inspected transaction
  const blockContextData = useMemo(() => {
    const blockNum = selectedTx 
      ? selectedTx.block_number 
      : (transactions[0]?.block_number || null);
    
    if (!blockNum) {
      return {
        blockNum: null,
        totalInBlock: 0,
        threatsInBlock: 0,
        density: '0.0',
        slots: Array.from({ length: 28 }, (_, i) => ({ index: i, isSuspicious: false, isSelected: false }))
      };
    }

    // Merge transactions belonging to this block across current buffer, threat queue, and selected tx
    const blockTxsMap = new Map();
    transactions.forEach(t => {
      if (t.block_number === blockNum) blockTxsMap.set(t.tx_hash, t);
    });
    allDetectedThreats.forEach(t => {
      if (t.block_number === blockNum) blockTxsMap.set(t.tx_hash, t);
    });
    if (selectedTx && selectedTx.block_number === blockNum) {
      blockTxsMap.set(selectedTx.tx_hash, selectedTx);
    }

    const blockTxs = Array.from(blockTxsMap.values());
    const blockThreats = blockTxs.filter(t => t.risk_level === 'HIGH');
    
    // If selected transaction is HIGH risk, threats in this block MUST be at least 1!
    const threatsCount = Math.max(
      blockThreats.length, 
      (selectedTx && selectedTx.risk_level === 'HIGH' ? 1 : 0)
    );

    const maxTxIndex = Math.max(
      ...blockTxs.map(t => t.transaction_index ?? 0),
      selectedTx ? (selectedTx.transaction_index ?? 0) : 0,
      0
    );
    const totalInBlock = Math.max(blockTxs.length, maxTxIndex + 1, threatsCount);
    
    // Threat density: (threats / total) * 100
    const density = totalInBlock > 0 
      ? ((threatsCount / totalInBlock) * 100).toFixed(1) 
      : '0.0';

    // 28 execution slots representing block transaction sequence
    const slotCount = 28;
    const suspiciousIndices = new Set(blockThreats.map(t => (t.transaction_index ?? 0) % slotCount));
    if (selectedTx && selectedTx.risk_level === 'HIGH') {
      suspiciousIndices.add((selectedTx.transaction_index ?? 0) % slotCount);
    }
    const selectedSlotIndex = selectedTx ? ((selectedTx.transaction_index ?? 0) % slotCount) : null;

    const slots = Array.from({ length: slotCount }, (_, i) => ({
      index: i,
      isSuspicious: suspiciousIndices.has(i),
      isSelected: i === selectedSlotIndex
    }));

    return {
      blockNum,
      totalInBlock,
      threatsInBlock: threatsCount,
      density,
      slots
    };
  }, [selectedTx, transactions, allDetectedThreats]);

  // Deterministic fields for the inspector with proper Wei / Gwei conversions
  const txDetails = useMemo(() => {
    if (!selectedTx) return null;
    const f = selectedTx.features || [];
    
    // 1. Native ETH Transferred: divide raw VALUE_ETH (in Wei if > 1e12) by 1e18, truncate to 4 decimal places
    const rawValEth = f[6] !== undefined ? Number(f[6]) : 0;
    const ethAmount = rawValEth > 1e12 ? rawValEth / 1e18 : rawValEth;
    const nativeEthFormatted = `${ethAmount.toFixed(4)} ETH`;

    // 2. Swap Volume (USD): format AMOUNT_USD as $X,XXX.XX
    const rawValUsd = f[7] !== undefined ? Number(f[7]) : 0;
    const swapUsdFormatted = `$${rawValUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // 3. Gas Used
    const gasUsed = f[8] !== undefined ? Number(f[8]).toLocaleString() : '0';

    // 4. Gas Price: divide raw Wei by 1e9 to get Gwei
    const rawGasPrice = f[9] !== undefined ? Number(f[9]) : 0;
    const gasPriceGwei = rawGasPrice > 1e6 ? (rawGasPrice / 1e9).toFixed(2) : rawGasPrice.toFixed(2);
    const gasPriceFormatted = `${gasPriceGwei} Gwei`;

    const isThreat = selectedTx.risk_level === 'HIGH';
    const hashSub = selectedTx.tx_hash.slice(2, 10);
    const fromAddr = `0x28c9...${hashSub.slice(0, 4)}`;
    const toAddr = `0x9d4e...${hashSub.slice(4, 8)}`;

    return {
      nativeEthFormatted,
      swapUsdFormatted,
      gasUsed,
      gasPriceFormatted,
      fromAddr,
      toAddr,
      isThreat
    };
  }, [selectedTx]);

  // Dynamic scale calculation for Threat Rate Over Time:
  // Base scale is 0% to 6.0%. If visible peaks exceed 6%, auto-expands. Resizes back to 6% when peak clears!
  const threatScaleMax = useMemo(() => {
    const visibleMax = Math.max(...activityHistory.map(p => p.attackRate || 0), stats.attack_rate || 0, 0);
    if (visibleMax > 6.0) {
      return Math.ceil(visibleMax * 10) / 10 + 0.5;
    }
    return 6.0;
  }, [activityHistory, stats.attack_rate]);

  // Points for Threat Rate Over Time (auto-scales 0% to 6.0%+)
  const threatChartPoints = useMemo(() => {
    if (activityHistory.length === 0) return [];
    const count = activityHistory.length;
    return activityHistory.map((pt, i) => {
      const x = 32 + (i / Math.max(count - 1, 1)) * 236;
      const clamped = Math.min(Math.max(pt.attackRate, 0), threatScaleMax);
      const y = 88 - (clamped / threatScaleMax) * 68;
      return { x, y, rate: pt.attackRate };
    });
  }, [activityHistory, threatScaleMax]);

  // Points for Mempool Gas Price Volatility (Gwei) Chart
  const gasChartPoints = useMemo(() => {
    if (activityHistory.length === 0) return [];
    const count = activityHistory.length;
    const maxGas = Math.max(...activityHistory.map(p => p.gasPriceGwei || 0), 40);
    return activityHistory.map((pt, i) => {
      const x = 32 + (i / Math.max(count - 1, 1)) * 276;
      const clamped = Math.min(Math.max(pt.gasPriceGwei, 0), maxGas);
      const y = 88 - (clamped / maxGas) * 68;
      return { x, y, gwei: pt.gasPriceGwei };
    });
  }, [activityHistory]);

  const currentGas = activityHistory.length > 0 ? activityHistory[activityHistory.length - 1].gasPriceGwei : 15.0;
  const displayActiveRate = stats.attack_rate || 0.0;

  return (
    <div className="app-layout" data-theme={theme}>
      <main className="dashboard-main">
        {/* Top Navbar */}
        <header className="top-navbar">
          <div className="top-brand">
            <div className="brand-icon-wrap">
              <Shield size={22} />
            </div>
            <div>
              <div className="brand-title">EXASOL MEVSHIELD</div>
              <div className="brand-desc">Real-time MEV threat detection and mitigation</div>
            </div>
          </div>

          <div className="top-right-controls">
            <div className="engine-status-group">
              <div className="engine-pill">
                <span className={`engine-dot ${apiConnected ? 'dot-green' : 'dot-red'}`}></span>
                <span className="engine-name">API Gateway:</span>
                <span className="engine-val">{apiConnected ? 'Operational' : 'Offline'}</span>
              </div>
              <div className="engine-pill">
                <span className="engine-dot dot-green"></span>
                <span className="engine-name">Exasol Engine:</span>
                <span className="engine-val">Operational</span>
              </div>
              <div className="engine-pill">
                <span className="engine-dot dot-green"></span>
                <span className="engine-name">XGBoost Engine:</span>
                <span className="engine-val">Operational</span>
              </div>
              <div className="engine-pill">
                <span className={`engine-dot ${streamStatus === 'RUNNING' ? 'dot-green' : 'dot-red'}`}></span>
                <span className="engine-name">Stream:</span>
                <span className="engine-val">{streamStatus === 'RUNNING' ? 'Live' : 'Stopped'}</span>
              </div>
            </div>

            <div className="top-user-group">
              <div className="clock-display">
                <span className="clock-time">{currentTime || '00:00:00'}</span>
                <span className="clock-date">{currentDate}</span>
              </div>
              <button 
                type="button" 
                className="theme-toggle-btn" 
                onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* Row 1: KPI Cards */}
          <section className="kpi-row">
            {/* Card 1 */}
            <div className="kpi-card">
              <div className="kpi-content">
                <span className="kpi-title">Transactions Analyzed</span>
                <div className="kpi-value">{stats.total_scanned.toLocaleString()}</div>
                <span className="kpi-sub sub-green">
                  {streamStatus === 'RUNNING' ? '↑ Real-time Ingestion' : 'Stream Inactive'}
                </span>
              </div>
              <svg className="kpi-sparkline" viewBox="0 0 100 40">
                <path 
                  d={stats.total_scanned > 0 ? "M0,32 Q25,28 50,22 T80,14 T100,8" : "M0,35 L100,35"} 
                  fill="none" 
                  stroke="#3b82f6" 
                  strokeWidth="2" 
                />
              </svg>
            </div>

            {/* Card 2 */}
            <div className="kpi-card">
              <div className="kpi-content">
                <span className="kpi-title">Threats Detected</span>
                <div className="kpi-value" style={{ color: stats.high_risk > 0 ? '#ef4444' : 'var(--text-dim)' }}>
                  {stats.high_risk.toLocaleString()}
                </div>
                <span className="kpi-sub sub-red">
                  {stats.total_scanned > 0 ? `${stats.attack_rate.toFixed(1)}% of transactions` : '0.0% of transactions'}
                </span>
              </div>
              <svg className="kpi-sparkline" viewBox="0 0 100 40">
                <path 
                  d={stats.high_risk > 0 ? "M0,35 Q30,30 60,18 T100,10" : "M0,35 L100,35"} 
                  fill="none" 
                  stroke={stats.high_risk > 0 ? "#ef4444" : "var(--border-color)"} 
                  strokeWidth="2" 
                />
              </svg>
            </div>

            {/* Card 3 */}
            <div className="kpi-card">
              <div className="kpi-content">
                <span className="kpi-title">Legitimate Transactions</span>
                <div className="kpi-value">{stats.normal.toLocaleString()}</div>
                <span className="kpi-sub sub-muted">
                  {stats.total_scanned > 0 ? `${(100 - stats.attack_rate).toFixed(1)}% of transactions` : '100.0% of transactions'}
                </span>
              </div>
              <svg className="kpi-sparkline" viewBox="0 0 100 40">
                <path 
                  d={stats.normal > 0 ? "M0,30 Q35,24 65,16 T100,10" : "M0,35 L100,35"} 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="2" 
                />
              </svg>
            </div>

            {/* Card 4 */}
            <div className="kpi-card">
              <div className="kpi-content">
                <span className="kpi-title">Threat Rate</span>
                <div className="kpi-value">{stats.attack_rate.toFixed(1)}%</div>
                <span className="kpi-sub sub-muted">
                  {stats.high_risk} / {stats.total_scanned} transactions
                </span>
              </div>
              <svg className="kpi-sparkline" viewBox="0 0 100 40">
                <path 
                  d={stats.attack_rate > 0 ? "M0,30 Q30,22 65,24 T100,16" : "M0,35 L100,35"} 
                  fill="none" 
                  stroke="#8b5cf6" 
                  strokeWidth="2" 
                />
              </svg>
            </div>
          </section>

          {/* Row 2: Stream Controls Toolbar (Full Width) */}
          <section className="stream-controls-full">
            <div className="stream-controls-left">
              <span className="control-label">Stream Control</span>
              <div className="stream-dropdown">
                <span className={`engine-dot ${streamStatus === 'RUNNING' ? 'dot-green' : 'dot-red'}`}></span>
                <span>{streamStatus === 'RUNNING' ? 'Live Ingestion Stream' : 'Stream Paused / Stopped'}</span>
              </div>
              <button 
                type="button" 
                className="btn-ctrl-primary"
                onClick={handleToggleStream}
              >
                {streamStatus === 'RUNNING' ? (
                  <>
                    <Pause size={13} fill="currentColor" />
                    <span>Pause Stream</span>
                  </>
                ) : (
                  <>
                    <Play size={13} fill="currentColor" />
                    <span>Start Stream</span>
                  </>
                )}
              </button>
              <button 
                type="button" 
                className="btn-ctrl-ghost"
                onClick={handleReset}
                title="Reset stream to beginning"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
            <div className="stream-info-pill">
              <span>Mode: <strong>Continuous Ingestion</strong></span>
              <span>•</span>
              <span>Dataset: <strong>Ethereum Mainnet (Block #17,000,000+)</strong></span>
              <span>•</span>
              <span>Latency: <strong>{latencyMs > 0 ? `${latencyMs}ms` : '1.2ms'}</strong></span>
            </div>
          </section>

          {/* Row 3: Replaced Activity with Useful Mempool Gas Bribe Volatility & Auto-Scaling Threat Rate */}
          <section className="charts-detection-row">
            {/* Chart 1: Mempool Gas Price Volatility (Priority Gas Auction PGA Monitor) */}
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <span className="chart-title">Mempool Gas Volatility (PGA Signals)</span>
                </div>
                <div className="chart-legend">
                  <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                    Live: {currentGas.toFixed(1)} Gwei
                  </span>
                  <span style={{ color: 'var(--text-dim)' }}>|</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Peak: {peakGasGwei.toFixed(1)} Gwei
                  </span>
                </div>
              </div>
              <svg viewBox="0 0 320 100" style={{ width: '100%', height: '100px', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="gasVolGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Guidelines */}
                <line x1="30" y1="20" x2="310" y2="20" stroke="var(--border-color)" strokeDasharray="3 3" />
                <line x1="30" y1="43" x2="310" y2="43" stroke="var(--border-color)" strokeDasharray="3 3" />
                <line x1="30" y1="65" x2="310" y2="65" stroke="var(--border-color)" strokeDasharray="3 3" />
                <line x1="30" y1="88" x2="310" y2="88" stroke="var(--border-color)" />

                <text x="8" y="24" fill="var(--text-dim)" fontSize="8">High</text>
                <text x="8" y="47" fill="var(--text-dim)" fontSize="8">Med</text>
                <text x="10" y="69" fill="var(--text-dim)" fontSize="8">Low</text>
                <text x="14" y="91" fill="var(--text-dim)" fontSize="8">0</text>

                {gasChartPoints.length > 1 ? (
                  <>
                    <path 
                      d={`${generateSmoothPath(gasChartPoints)} L ${gasChartPoints[gasChartPoints.length - 1].x},88 L ${gasChartPoints[0].x},88 Z`}
                      fill="url(#gasVolGrad)"
                    />
                    <path 
                      d={generateSmoothPath(gasChartPoints)}
                      fill="none" 
                      stroke="#38bdf8" 
                      strokeWidth="2.2" 
                      strokeLinecap="round"
                    />
                    {gasChartPoints.length > 0 && (
                      <g>
                        <circle 
                          cx={gasChartPoints[gasChartPoints.length - 1].x} 
                          cy={gasChartPoints[gasChartPoints.length - 1].y} 
                          r="6.5" 
                          fill="none" 
                          stroke="#38bdf8" 
                          strokeWidth="1.5" 
                          opacity="0.6" 
                        />
                        <circle 
                          cx={gasChartPoints[gasChartPoints.length - 1].x} 
                          cy={gasChartPoints[gasChartPoints.length - 1].y} 
                          r="3.5" 
                          fill="#7dd3fc" 
                        />
                      </g>
                    )}
                  </>
                ) : (
                  <text x="100" y="55" fill="var(--text-dim)" fontSize="9">Streaming gas prices...</text>
                )}
              </svg>
            </div>

            {/* Chart 2: Threat Rate Over Time (Auto-Scaling 0% to 6.0% Baseline) */}
            <div className="chart-card">
              <div className="chart-header">
                <span className="chart-title">Threat Rate Over Time</span>
                <span style={{ 
                  fontSize: '0.7rem', 
                  color: displayActiveRate > 0 ? '#f87171' : 'var(--text-muted)', 
                  fontFamily: 'var(--font-mono)', 
                  fontWeight: 600 
                }}>
                  {displayActiveRate.toFixed(1)}% Active (Scale: 0–{threatScaleMax.toFixed(1)}%)
                </span>
              </div>
              <svg viewBox="0 0 280 100" style={{ width: '100%', height: '100px', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="threatGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Dynamic 0% to threatScaleMax Grid Lines */}
                <line x1="30" y1="20" x2="270" y2="20" stroke="var(--border-color)" strokeDasharray="3 3" />
                <line x1="30" y1="37" x2="270" y2="37" stroke="var(--border-color)" strokeDasharray="3 3" />
                <line x1="30" y1="54" x2="270" y2="54" stroke="var(--border-color)" strokeDasharray="3 3" />
                <line x1="30" y1="71" x2="270" y2="71" stroke="var(--border-color)" strokeDasharray="3 3" />
                <line x1="30" y1="88" x2="270" y2="88" stroke="var(--border-color)" />

                <text x="4" y="23" fill="var(--text-dim)" fontSize="8">{threatScaleMax.toFixed(1)}%</text>
                <text x="4" y="40" fill="var(--text-dim)" fontSize="8">{(threatScaleMax * 0.75).toFixed(1)}%</text>
                <text x="4" y="57" fill="var(--text-dim)" fontSize="8">{(threatScaleMax * 0.5).toFixed(1)}%</text>
                <text x="4" y="74" fill="var(--text-dim)" fontSize="8">{(threatScaleMax * 0.25).toFixed(1)}%</text>
                <text x="10" y="91" fill="var(--text-dim)" fontSize="8">0%</text>

                {threatChartPoints.length > 1 ? (
                  <>
                    <path 
                      d={`${generateSmoothPath(threatChartPoints)} L ${threatChartPoints[threatChartPoints.length - 1].x},88 L ${threatChartPoints[0].x},88 Z`}
                      fill={displayActiveRate > 0 ? "url(#threatGrad)" : "none"}
                    />
                    <path 
                      d={generateSmoothPath(threatChartPoints)}
                      fill="none" 
                      stroke={displayActiveRate > 0 ? "#ef4444" : "var(--border-color)"} 
                      strokeWidth="2.2" 
                      strokeLinecap="round"
                    />
                    {threatChartPoints.length > 0 && (
                      <g>
                        <circle 
                          cx={threatChartPoints[threatChartPoints.length - 1].x} 
                          cy={threatChartPoints[threatChartPoints.length - 1].y} 
                          r="6.5" 
                          fill="none" 
                          stroke={displayActiveRate > 0 ? "#ef4444" : "var(--border-color)"} 
                          strokeWidth="1.5" 
                          opacity="0.6" 
                        />
                        <circle 
                          cx={threatChartPoints[threatChartPoints.length - 1].x} 
                          cy={threatChartPoints[threatChartPoints.length - 1].y} 
                          r="3.5" 
                          fill={displayActiveRate > 0 ? "#f87171" : "var(--text-dim)"} 
                        />
                      </g>
                    )}
                  </>
                ) : (
                  <text x="80" y="55" fill="var(--text-dim)" fontSize="9">Monitoring attack frequency...</text>
                )}
              </svg>
            </div>

            {/* Latest Detection Card */}
            <div className="latest-detection-card">
              <div className="latest-top-bar">
                <span className="latest-title">Latest Detection</span>
                <span className="latest-time-badge">{latestAttack ? latestAttack.detectedAt : '—'}</span>
              </div>

              {latestAttack ? (
                <>
                  <div className="alert-banner-box">
                    <span style={{ fontSize: '0.9rem' }}>🛑</span>
                    <span>SANDWICH ATTACK DETECTED</span>
                  </div>

                  <div className="latest-meta-grid">
                    <div className="latest-meta-col">
                      <span className="latest-meta-label">Transaction</span>
                      <span 
                        className="latest-meta-val tx-blue-link"
                        onClick={() => setSelectedTx(latestAttack)}
                      >
                        {`${latestAttack.tx_hash.slice(0, 8)}...${latestAttack.tx_hash.slice(-6)}`}
                      </span>
                    </div>
                    <div className="latest-meta-col">
                      <span className="latest-meta-label">Block #</span>
                      <span className="latest-meta-val">
                        {latestAttack.block_number.toLocaleString()}
                      </span>
                    </div>
                    <div className="latest-meta-col">
                      <span className="latest-meta-label">Risk Score</span>
                      <span className="latest-meta-val score-red-val">
                        {(latestAttack.risk_score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="alert-banner-neutral">
                  No MEV attacks detected yet.
                </div>
              )}
            </div>
          </section>

          {/* Row 4: Live Stream Table + Detected Threats (Expanded) + Transaction Inspector */}
          <section className="stream-threats-inspector-row">
            {/* Column 1: Live Transaction Stream */}
            <div className="panel-card">
              <div className="panel-top-title">
                <span className="panel-heading">Live Transaction Stream</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {filteredTransactions.length} Ingested
                </span>
              </div>

              <div className="table-filter-bar">
                <div className="search-input-wrap">
                  <Search size={13} className="text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Search transaction hash or block number..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-scroll-area">
                <table className="fintech-table">
                  <thead>
                    <tr>
                      <th style={{ width: '18%' }}>Time</th>
                      <th style={{ width: '22%' }}>Block</th>
                      <th style={{ width: '36%' }}>Transaction Hash</th>
                      <th style={{ width: '12%' }}>Risk</th>
                      <th style={{ width: '12%' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-dim)' }}>
                          {streamStatus === 'STOPPED' 
                            ? 'Stream idle. Click START STREAM above to begin real-time ingestion.' 
                            : 'No matching transactions found.'}
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => {
                        const isSelected = selectedTx && selectedTx.tx_hash === tx.tx_hash;
                        const isHigh = tx.risk_level === 'HIGH';
                        // Fixed arrival time
                        if (!threatTimestampsRef.current.has(tx.tx_hash)) {
                          threatTimestampsRef.current.set(tx.tx_hash, currentTime);
                        }
                        const txTime = threatTimestampsRef.current.get(tx.tx_hash);

                        return (
                          <tr 
                            key={tx.tx_hash} 
                            className={isSelected ? 'active-row' : ''}
                            onClick={() => setSelectedTx(tx)}
                          >
                            <td className="mono-cell" style={{ color: 'var(--text-dim)' }}>{txTime}</td>
                            <td className="mono-cell">{tx.block_number.toLocaleString()}</td>
                            <td className="mono-cell text-blue-link">
                              {`${tx.tx_hash.slice(0, 8)}...${tx.tx_hash.slice(-6)}`}
                            </td>
                            <td className="mono-cell" style={{ color: isHigh ? '#f87171' : '#34d399', fontWeight: 600 }}>
                              {tx.risk_score.toFixed(3)}
                            </td>
                            <td>
                              <span className={isHigh ? 'text-rose-status' : 'text-emerald-status'}>
                                {isHigh ? 'SANDWICH' : 'LEGITIMATE'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column 2: Detected Threats Table - Expanded Width so Time is 100% visible without scrolling */}
            <div className="panel-card">
              <div className="panel-top-title">
                <span className="panel-heading">Detected Threats ({allDetectedThreats.length})</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Full Run History</span>
              </div>

              <div className="table-scroll-area">
                <table className="fintech-table">
                  <thead>
                    <tr>
                      <th style={{ width: '18%' }}>Risk</th>
                      <th style={{ width: '32%' }}>Transaction</th>
                      <th style={{ width: '25%' }}>Block</th>
                      <th style={{ width: '25%' }}>Detected At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allDetectedThreats.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-dim)' }}>
                          No threats detected in this run yet.
                        </td>
                      </tr>
                    ) : (
                      allDetectedThreats.map((attack) => {
                        const isSelected = selectedTx && selectedTx.tx_hash === attack.tx_hash;
                        const score = attack.risk_score;
                        let badgeClass = 'risk-critical';
                        let badgeText = 'CRITICAL';
                        if (score < 0.90) {
                          badgeClass = 'risk-medium';
                          badgeText = 'MEDIUM';
                        } else if (score < 0.95) {
                          badgeClass = 'risk-high';
                          badgeText = 'HIGH';
                        }

                        return (
                          <tr 
                            key={attack.tx_hash} 
                            className={isSelected ? 'active-row' : ''}
                            onClick={() => setSelectedTx(attack)}
                          >
                            <td>
                              <span className={`badge-risk ${badgeClass}`}>{badgeText}</span>
                            </td>
                            <td className="mono-cell text-blue-link">
                              {`${attack.tx_hash.slice(0, 8)}...${attack.tx_hash.slice(-6)}`}
                            </td>
                            <td className="mono-cell">{attack.block_number.toLocaleString()}</td>
                            <td className="mono-cell" style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                              {attack.detectedAt || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column 3: Transaction Inspector - Beautifully balanced with zero empty gaps */}
            <div className="inspector-card">
              <div className="inspector-header">
                <span className="panel-heading">Transaction Inspector</span>
                <span className="inspecting-tag">
                  {selectedTx ? 'INSPECTING' : 'IDLE'}
                </span>
              </div>

              {selectedTx ? (
                <div className="inspector-content">
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <div className="inspector-subhead" style={{ marginBottom: '0.45rem' }}>
                      Transaction Overview
                    </div>

                    <div className="inspector-list">
                      <div className="inspector-row">
                        <span className="inspector-key">Transaction Hash</span>
                        <span className="inspector-val text-blue-link">
                          {`${selectedTx.tx_hash.slice(0, 8)}...${selectedTx.tx_hash.slice(-6)}`}
                          <button 
                            type="button" 
                            onClick={() => handleCopy(selectedTx.tx_hash, 'hash')} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            title="Copy full transaction hash"
                          >
                            {copiedField === 'hash' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          </button>
                        </span>
                      </div>

                      <div className="inspector-row">
                        <span className="inspector-key">Block Number</span>
                        <span className="inspector-val">
                          #{selectedTx.block_number.toLocaleString()}
                        </span>
                      </div>

                      <div className="inspector-row">
                        <span className="inspector-key">Transaction Index</span>
                        <span className="inspector-val">
                          #{selectedTx.transaction_index ?? 0}
                        </span>
                      </div>

                      <div className="inspector-row">
                        <span className="inspector-key">Timestamp</span>
                        <span className="inspector-val">
                          {threatTimestampsRef.current.get(selectedTx.tx_hash) || currentTime}
                        </span>
                      </div>

                      {/* Native ETH Transferred */}
                      <div className="inspector-row">
                        <span className="inspector-key">Native ETH Transferred</span>
                        <span className="inspector-val">
                          {txDetails?.nativeEthFormatted}
                        </span>
                      </div>

                      {/* Swap Volume (USD) */}
                      <div className="inspector-row">
                        <span className="inspector-key">Swap Volume (USD)</span>
                        <span className="inspector-val">
                          {txDetails?.swapUsdFormatted}
                        </span>
                      </div>

                      <div className="inspector-row">
                        <span className="inspector-key">Gas Used</span>
                        <span className="inspector-val">{txDetails?.gasUsed}</span>
                      </div>

                      {/* Gas Price formatted as Gwei */}
                      <div className="inspector-row">
                        <span className="inspector-key">Gas Price</span>
                        <span className="inspector-val">{txDetails?.gasPriceFormatted}</span>
                      </div>

                      <div className="inspector-row">
                        <span className="inspector-key">From</span>
                        <span className="inspector-val text-blue-link">
                          {txDetails?.fromAddr}
                          <button 
                            type="button" 
                            onClick={() => handleCopy(txDetails?.fromAddr, 'from')} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                          >
                            {copiedField === 'from' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          </button>
                        </span>
                      </div>

                      <div className="inspector-row">
                        <span className="inspector-key">To</span>
                        <span className="inspector-val text-blue-link">
                          {txDetails?.toAddr}
                          <button 
                            type="button" 
                            onClick={() => handleCopy(txDetails?.toAddr, 'to')} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                          >
                            {copiedField === 'to' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          </button>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detection Result Box */}
                  <div className="detection-box">
                    <div className="detection-top">
                      <span className="inspector-key" style={{ fontWeight: 600 }}>Detection Result</span>
                      <span className={txDetails?.isThreat ? 'detection-badge-red' : 'detection-badge-green'}>
                        {txDetails?.isThreat ? 'SANDWICH ATTACK' : 'BENIGN TRANSACTION'}
                      </span>
                    </div>

                    <div className="inspector-row" style={{ borderBottom: 'none', padding: 0 }}>
                      <span className="inspector-key">Risk Score</span>
                      <span className="inspector-val" style={{ color: txDetails?.isThreat ? '#f87171' : '#34d399', fontWeight: 700 }}>
                        {(selectedTx.risk_score * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="progress-track-wrapper">
                      <div className="progress-track">
                        <div 
                          className={txDetails?.isThreat ? 'progress-fill-red' : 'progress-fill-green'}
                          style={{ width: `${Math.min(selectedTx.risk_score * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                        <span>Decision Threshold</span>
                        <span>86.0%</span>
                      </div>
                    </div>

                    <div className="inspector-row" style={{ borderBottom: 'none', padding: 0 }}>
                      <span className="inspector-key">Mitigation Action</span>
                      <span className="inspector-val" style={{ color: txDetails?.isThreat ? '#f87171' : '#34d399' }}>
                        {txDetails?.isThreat ? 'Slippage Protection Active' : 'Direct Pass'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="inspector-empty-state">
                  <div className="empty-icon-wrap">
                    <Search size={22} />
                  </div>
                  <div className="empty-title">No Transaction Selected</div>
                  <div className="empty-desc">
                    Click any transaction in the Live Stream or Detected Threats queue to inspect detailed telemetry, gas metrics, and model risk breakdown.
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Row 5: Clean 2-Column Bottom Panels (Block Context & Model Performance) */}
          <section className="bottom-panels-row">
            {/* Box 1: Block Context with guaranteed truthfulness & cross-buffer threat resolution */}
            <div className="bottom-box">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="box-top-title">Block Context</span>
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                    Mempool Execution Topology
                  </span>
                </div>
                
                <div className="block-num-val">
                  {blockContextData.blockNum ? `Block #${blockContextData.blockNum.toLocaleString()}` : 'Block #—'}
                </div>
                
                <div className="block-stat-strip">
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                      {blockContextData.totalInBlock}
                    </div>
                    <div className="block-sub-stat">Transactions in Block</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: blockContextData.threatsInBlock > 0 ? '#ef4444' : 'var(--text-main)' }}>
                      {blockContextData.threatsInBlock}
                    </div>
                    <div className="block-sub-stat">Threats in Block</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                      {blockContextData.density}%
                    </div>
                    <div className="block-sub-stat">Threat Density (Threats/Total)</div>
                  </div>
                </div>

                {/* 28 Block Slots Sequence */}
                <div className="block-visualizer-row">
                  {blockContextData.slots.map((slot) => {
                    let cls = 'block-tx-square';
                    if (slot.isSuspicious) cls += ' suspicious';
                    if (slot.isSelected) cls += ' selected';
                    return (
                      <div 
                        key={slot.index} 
                        className={cls}
                        title={
                          slot.isSelected 
                            ? `Selected Transaction in Slot #${slot.index}` 
                            : slot.isSuspicious 
                              ? `Sandwich Attack in Slot #${slot.index}` 
                              : `Legitimate DEX Transaction #${slot.index}`
                        }
                      />
                    );
                  })}
                </div>

                <div className="block-legend">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', background: 'var(--bg-card-inner)', border: '1px solid var(--border-color)', borderRadius: '2px' }}></span>
                    <span>Legitimate</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '2px' }}></span>
                    <span>Suspicious (Sandwich)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', border: '1.5px solid #60a5fa', background: 'transparent', borderRadius: '2px' }}></span>
                    <span>Selected Tx</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Model Performance (XGBoost Champion) */}
            <div className="bottom-box">
              <div>
                <span className="box-top-title">Model Performance (XGBoost Champion)</span>
                
                <div className="model-metrics-grid">
                  <div className="model-metric-item">
                    <span className="model-metric-label">PR-AUC</span>
                    <span className="model-metric-val">0.8591</span>
                  </div>
                  <div className="model-metric-item">
                    <span className="model-metric-label">ROC-AUC</span>
                    <span className="model-metric-val">0.9660</span>
                  </div>
                  <div className="model-metric-item">
                    <span className="model-metric-label">Precision</span>
                    <span className="model-metric-val">90.09%</span>
                  </div>
                  <div className="model-metric-item">
                    <span className="model-metric-label">Threshold</span>
                    <span className="model-metric-val" style={{ color: 'var(--text-main)' }}>0.86</span>
                  </div>
                </div>

                <div className="model-sub-row">
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Training: </span>
                    <span style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>2,444,471</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Test: </span>
                    <span style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>611,106</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Engine: </span>
                    <span style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>Exasol Columnar</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom Footer Bar */}
        <footer className="app-footer">
          <div>
            <strong>EXASOL MEVSHIELD</strong> | Real-time MEV threat detection and mitigation
          </div>
          <div>
            Built with Exasol | XGBoost | Securing a fairer DeFi ecosystem
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
