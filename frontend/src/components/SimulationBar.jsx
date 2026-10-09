/**
 * src/components/SimulationBar.jsx
 * Persistent Top Bar with complete simulation replay controls, speed tuning, and live telemetry.
 */

import React, { useState } from 'react';
import { Play, Pause, Square, FastForward, Activity, Calendar } from 'lucide-react';
import { api } from '../services/api';

export default function SimulationBar({ simStatus, onStatusChange }) {
  const [loading, setLoading] = useState(false);
  const status = simStatus?.status || 'STOPPED';
  const progress = simStatus?.progress_percentage || 0;
  const currentIdx = simStatus?.current_index || 0;
  const total = simStatus?.total_transactions || 12500;
  const delay = simStatus?.delay_seconds || 5.0;
  const simDate = simStatus?.current_simulated_date || 'Awaiting Replay';
  const lastTx = simStatus?.last_processed_tx;

  const handleStart = async () => {
    try {
      setLoading(true);
      const res = await api.startSimulation();
      if (onStatusChange) onStatusChange(res);
    } catch (err) {
      alert(`Simulation start error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setLoading(true);
      const res = await api.pauseSimulation();
      if (onStatusChange) onStatusChange(res);
    } catch (err) {
      alert(`Simulation pause error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setLoading(true);
      const res = await api.resumeSimulation();
      if (onStatusChange) onStatusChange(res);
    } catch (err) {
      alert(`Simulation resume error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setLoading(true);
      const res = await api.stopSimulation();
      if (onStatusChange) onStatusChange(res);
    } catch (err) {
      alert(`Simulation stop error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeedChange = async (newDelay) => {
    try {
      const res = await api.setSimulationSpeed(newDelay);
      if (onStatusChange) onStatusChange(res);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="sim-top-bar">
      <div className="sim-info">
        <div className={`sim-status-pill status-${status}`}>
          <span className="sim-pulse-dot" />
          <span>{status}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          <Calendar size={14} color="var(--primary-light)" />
          <span>{simDate ? simDate.replace('T', ' ') : '—'}</span>
        </div>
      </div>

      {/* Progress telemetry */}
      <div className="sim-progress-container">
        <div className="sim-progress-text">
          <span>{currentIdx.toLocaleString()} Customer Purchases</span>
          <span style={{ color: status === 'RUNNING' ? 'var(--success)' : 'var(--text-secondary)' }}>
            {status === 'RUNNING' ? '● Active' : status}
          </span>
        </div>
        <div className="sim-progress-bar-bg">
          <div className="sim-progress-bar-fill" style={{ width: status === 'RUNNING' ? '100%' : `${progress}%` }} />
        </div>
      </div>

      {/* Live Transaction Preview Pill */}
      {lastTx && (
        <div className="tx-ticker" style={{ maxWidth: '380px' }} title={`${lastTx.customer_id || 'Customer'}: ${lastTx.product_name} x ${lastTx.quantity}`}>
          <Activity size={14} color="var(--primary)" />
          <span style={{ color: 'var(--primary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {lastTx.customer_id || 'CUST'}:
          </span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {lastTx.product_name} <strong style={{ color: 'var(--danger)' }}>×{lastTx.quantity}</strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            | Stock: {lastTx.previous_stock} → <strong style={{ color: (lastTx.new_stock || 0) <= (lastTx.reorder_point || 20) ? 'var(--danger)' : 'var(--success)' }}>{lastTx.new_stock}</strong>
          </span>
          <span className={`badge badge-${(lastTx.stockout_risk || 'low').toLowerCase()}`} style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
            {lastTx.stockout_risk || 'LOW'}
          </span>
        </div>
      )}

      {/* Simulation Replay Controls */}
      <div className="sim-controls">
        {status === 'STOPPED' && (
          <button className="btn btn-success btn-sm" onClick={handleStart} disabled={loading}>
            <Play size={14} fill="currentColor" />
            <span>START SIMULATION</span>
          </button>
        )}

        {status === 'RUNNING' && (
          <button className="btn btn-secondary btn-sm" onClick={handlePause} disabled={loading} style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}>
            <Pause size={14} fill="currentColor" />
            <span>PAUSE</span>
          </button>
        )}

        {status === 'PAUSED' && (
          <button className="btn btn-success btn-sm" onClick={handleResume} disabled={loading}>
            <Play size={14} fill="currentColor" />
            <span>RESUME</span>
          </button>
        )}

        {(status === 'RUNNING' || status === 'PAUSED') && (
          <button className="btn btn-danger btn-sm" onClick={handleStop} disabled={loading}>
            <Square size={14} fill="currentColor" />
            <span>STOP</span>
          </button>
        )}

        {/* Speed tuning pills */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '2px', marginLeft: '6px' }}>
          {[1.0, 2.0, 5.0, 10.0, 30.0].map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              style={{
                background: delay === s ? 'var(--primary)' : 'transparent',
                color: delay === s ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={`Simulate 1 customer purchase every ${s} seconds`}
            >
              {s}s
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
