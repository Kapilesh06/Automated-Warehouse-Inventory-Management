/**
 * src/pages/SimulationPage.jsx
 * Dedicated Transaction Simulator Control Room fulfilling Sections 20, 21, and 22 specifications.
 */

import React, { useState } from 'react';
import {
  PlaySquare,
  Play,
  Pause,
  Square,
  FastForward,
  Activity,
  Calendar,
  Layers,
  Sparkles,
  Bot,
  RefreshCw,
  Clock
} from 'lucide-react';
import { api } from '../services/api';

export default function SimulationPage({ simStatus, onStatusChange }) {
  const [loading, setLoading] = useState(false);
  const status = simStatus?.status || 'STOPPED';
  const progress = simStatus?.progress_percentage || 0;
  const currentIdx = simStatus?.current_index || 0;
  const total = simStatus?.total_transactions || 12500;
  const delay = simStatus?.delay_seconds || 5.0;
  const simDate = simStatus?.current_simulated_date || 'Awaiting Replay';
  const lastTx = simStatus?.last_processed_tx;

  const handleStart = async (idx) => {
    try {
      setLoading(true);
      const res = await api.startSimulation(idx);
      if (onStatusChange) onStatusChange(res);
    } catch (err) {
      alert(`Error starting simulation: ${err.message}`);
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
      alert(`Error pausing simulation: ${err.message}`);
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
      alert(`Error resuming simulation: ${err.message}`);
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
      alert(`Error stopping simulation: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeed = async (newDelay) => {
    try {
      const res = await api.setSimulationSpeed(newDelay);
      if (onStatusChange) onStatusChange(res);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Simulation Deck */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="brand-icon-box" style={{ width: '36px', height: '36px' }}>
                <PlaySquare size={20} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Real-Time Customer Purchase Simulator
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Generates simulated customer purchases in real time from the current inventory database, updates balances, and executes the 5 AI agents.
            </p>
          </div>

          <div className={`sim-status-pill status-${status}`} style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
            <span className="sim-pulse-dot" />
            <span>Status: {status}</span>
          </div>
        </div>

        {/* Big Telemetry Panel */}
        <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Simulation Activity: {status === 'RUNNING' ? 'Active Real-Time Customer Purchases' : status}
            </span>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              <span>Purchases Generated: <strong>{currentIdx.toLocaleString()}</strong></span>
              <span>Interval: <strong>{delay}s</strong></span>
              <span>Last Event: <strong style={{ color: 'var(--primary)' }}>{simDate}</strong></span>
            </div>
          </div>

          <div className="sim-progress-bar-bg" style={{ height: '12px' }}>
            <div className="sim-progress-bar-fill" style={{ width: status === 'RUNNING' ? '100%' : `${progress}%` }} />
          </div>
        </div>

        {/* Master Control Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {status === 'STOPPED' && (
              <button className="btn btn-success" onClick={() => handleStart()} disabled={loading} style={{ padding: '12px 24px', fontSize: '0.95rem' }}>
                <Play size={18} fill="currentColor" />
                <span>START SIMULATION</span>
              </button>
            )}

            {status === 'RUNNING' && (
              <button className="btn btn-secondary" onClick={handlePause} disabled={loading} style={{ borderColor: 'var(--warning)', color: 'var(--warning)', padding: '12px 24px' }}>
                <Pause size={18} fill="currentColor" />
                <span>PAUSE</span>
              </button>
            )}

            {status === 'PAUSED' && (
              <button className="btn btn-success" onClick={handleResume} disabled={loading} style={{ padding: '12px 24px' }}>
                <Play size={18} fill="currentColor" />
                <span>RESUME</span>
              </button>
            )}

            {(status === 'RUNNING' || status === 'PAUSED') && (
              <button className="btn btn-danger" onClick={handleStop} disabled={loading} style={{ padding: '12px 24px' }}>
                <Square size={18} fill="currentColor" />
                <span>STOP & RESET</span>
              </button>
            )}
          </div>

          {/* Speed Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Purchase Interval:</span>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: '4px' }}>
              {[1.0, 2.0, 5.0, 10.0, 30.0].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeed(s)}
                  style={{
                    background: delay === s ? 'var(--primary)' : 'transparent',
                    color: delay === s ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Transaction Multi-Agent Reaction Card (Section 17) */}
      {lastTx ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 17 Required Status & Current Transaction Summary Card */}
          <div className="card" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Live Customer Purchase State
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Purchases Generated: <strong>{currentIdx}</strong>
                </span>
                <span className={`badge ${status === 'RUNNING' ? 'badge-success' : 'badge-secondary'}`}>
                  {status}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Customer</span>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  {lastTx.customer_id || 'CUST-1001'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Transaction ID</span>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {lastTx.transaction_id || `SIM-${currentIdx.toString().padStart(6, '0')}`}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Product</span>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  {lastTx.product_name || 'Item'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Quantity</span>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  {lastTx.quantity}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Previous Stock</span>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
                  {lastTx.previous_stock ?? (lastTx.new_stock + lastTx.quantity)}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Current Stock</span>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: (lastTx.current_stock ?? lastTx.new_stock) <= (lastTx.reorder_point || 20) ? 'var(--danger)' : 'var(--success)' }}>
                  {lastTx.current_stock ?? lastTx.new_stock}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>AI Decision</span>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: (lastTx.ai_decision || lastTx.decision) === 'REORDER NOW' ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {lastTx.ai_decision || lastTx.decision || 'NO ACTION'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Recommendation</span>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }}>
                  {lastTx.recommendation || (lastTx.recommended_reorder_qty ? `${lastTx.recommended_reorder_qty} units` : '0 units')}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Approval</span>
                <div>
                  <span className="badge badge-warning" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                    {lastTx.approval_status || 'PENDING'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <div className="card-header">
              <div className="card-title">
                <Activity size={18} color="var(--primary)" />
                <span>Multi-Agent 5-Agent Step Breakdown</span>
              </div>
              <span className="badge badge-primary">{lastTx.transaction_id}</span>
            </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Step 1: Inventory Agent */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', borderLeft: '3px solid #4f46e5' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>
                1. Inventory Agent
              </div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem', marginTop: '4px' }}>
                {lastTx.product_name}
              </div>
              <div style={{ fontSize: '0.82rem', color: lastTx.transaction_type === 'ISSUE' ? 'var(--danger)' : 'var(--success)', fontWeight: 700, marginTop: '2px' }}>
                {lastTx.transaction_type}: {lastTx.transaction_type === 'ISSUE' ? `-${lastTx.quantity}` : `+${lastTx.quantity}`} units
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                New Stock Balance: <strong style={{ color: 'var(--text-primary)' }}>{lastTx.new_stock}</strong>
              </div>
            </div>

            {/* Step 2: Demand Agent */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', borderLeft: '3px solid #0284c7' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                2. Demand Prediction Agent
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '6px' }}>
                30-Day Forecast: <strong>{lastTx.predicted_demand} units</strong>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                7-Day Velocity: <strong>{lastTx.short_term_demand} units</strong>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Models: Random Forest & Gradient Boost
              </div>
            </div>

            {/* Step 3: Stock Alert Agent */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', borderLeft: '3px solid #d97706' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
                3. Stock Alert Agent
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Stockout Risk:</span>
                <span className={`badge badge-${lastTx.stockout_risk.toLowerCase()}`}>
                  {lastTx.stockout_risk}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Status:</span>
                <span className="badge badge-secondary">{lastTx.inventory_status}</span>
              </div>
            </div>

            {/* Step 4 & 5: Reorder & Decision Agent */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', borderLeft: '3px solid #059669' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                4 & 5. Reorder & Decision Agent
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '6px' }}>
                Suggested Reorder: <strong style={{ color: 'var(--primary)' }}>+{lastTx.recommended_reorder_qty} units</strong>
              </div>
              <div style={{ marginTop: '8px' }}>
                <span
                  className={`badge ${
                    lastTx.decision === 'REORDER NOW'
                      ? 'badge-danger'
                      : lastTx.decision === 'REORDER SOON'
                      ? 'badge-warning'
                      : 'badge-success'
                  }`}
                  style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                >
                  Decision: {lastTx.decision}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Clock size={32} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
          <p style={{ fontWeight: 600 }}>Simulator is stopped. Click "START SIMULATION" to begin sequential replay.</p>
        </div>
      )}
    </div>
  );
}
