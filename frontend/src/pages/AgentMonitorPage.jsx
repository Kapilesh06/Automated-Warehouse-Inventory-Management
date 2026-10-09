/**
 * src/pages/AgentMonitorPage.jsx
 * Visual Multi-Agent Architecture Monitoring Console fulfilling Section 31 specifications.
 * Displays live statuses, last actions, and real-time telemetry across all 5 collaborative agents.
 */

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Cpu,
  Layers,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  Activity,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export default function AgentMonitorPage() {
  const [agents, setAgents] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAgentStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getAgentsStatus();
      setAgents(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentStatus();
    const interval = setInterval(fetchAgentStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const agentCards = [
    {
      key: 'inventory_agent',
      icon: Layers,
      color: '#6366f1',
      title: 'Inventory Agent',
      desc: 'Monitors real-time stock balances across 8 facilities, prevents negative balances, and reconciles all transaction movements.'
    },
    {
      key: 'demand_agent',
      icon: TrendingUp,
      color: '#38bdf8',
      title: 'Demand Prediction Agent',
      desc: 'Calculates rolling sales velocity (3d, 7d, 14d, 30d) and calls Model 1 (Random Forest) & Model 2 (Gradient Boosting).'
    },
    {
      key: 'stock_alert_agent',
      icon: AlertTriangle,
      color: '#fbbf24',
      title: 'Stock Alert Agent',
      desc: 'Evaluates stock against reorder points, calls Model 3 (Risk Classifier) & Model 5 (Status Classifier), and fires alerts.'
    },
    {
      key: 'reorder_agent',
      icon: RotateCcw,
      color: '#a855f7',
      title: 'Reorder Planning Agent',
      desc: 'Calculates dynamic reorder points, calls Model 4 (Reorder Quantity Regressor), and deducts pipeline open POs.'
    },
    {
      key: 'decision_agent',
      icon: Cpu,
      color: '#10b981',
      title: 'Executive Decision Agent',
      desc: 'Synthesizes multi-agent signals into authoritative decisions (NO ACTION, MONITOR, REORDER SOON, REORDER NOW).'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header Card */}
      <div className="card" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-icon-box" style={{ width: '36px', height: '36px' }}>
              <Bot size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Multi-Agent Collaboration Architecture
            </h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            5 autonomous AI agents orchestrating sequential transaction auditing, ML inference, and inventory policy.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={fetchAgentStatus} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Agents</span>
        </button>
      </div>

      {/* Multi-Agent Sequential Flow Diagram */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
          Sequential Event Processing Pipeline
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {agentCards.map((agent, idx) => {
            const Icon = agent.icon;
            return (
              <React.Fragment key={agent.key}>
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flex: '1 1 160px'
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: `${agent.color}22`,
                      color: agent.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>Agent {idx + 1}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{agent.title.replace('Agent', '')}</div>
                  </div>
                </div>

                {idx < agentCards.length - 1 && (
                  <ArrowRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 5 Individual Agent Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {agentCards.map((a, idx) => {
          const info = agents ? agents[a.key] : null;
          const Icon = a.icon;

          return (
            <div
              key={a.key}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderLeft: `4px solid ${a.color}`
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: 'var(--radius-sm)',
                        background: `${a.color}20`,
                        color: a.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {info?.name || a.title}
                      </h3>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {info?.role || `Pipeline Agent ${idx + 1}`}
                      </div>
                    </div>
                  </div>

                  <span className="badge badge-success">
                    <span className="sim-pulse-dot" style={{ width: '6px', height: '6px' }} />
                    <span>{info?.status || 'Active'}</span>
                  </span>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
                  {a.desc}
                </p>

                {/* Last action box */}
                <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: a.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                    Last Completed Action
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1.4 }}>
                    {info?.last_action || 'Standing by for live transactions...'}
                  </div>
                </div>

                {/* Metrics */}
                {info?.metrics && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', background: '#f1f5f9', padding: '10px', borderRadius: '8px' }}>
                    {Object.entries(info.metrics).map(([k, v]) => (
                      <div key={k}>
                        <div className="stat-label" style={{ fontSize: '0.62rem' }}>
                          {k.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem', marginTop: '2px' }}>
                          {typeof v === 'number' ? (v % 1 !== 0 ? v.toFixed(2) : v.toLocaleString()) : v}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>Telemetric Heartbeat</span>
                <span>{info?.last_updated || 'Active'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
