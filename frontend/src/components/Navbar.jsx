/**
 * src/components/Navbar.jsx
 * Top Navigation Header with Page Title, Live WebSocket status, Alert dropdown, and Quick Actions.
 */

import React, { useState } from 'react';
import { Bell, Zap, ArrowLeftRight, Check, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function Navbar({
  pageTitle,
  isConnected,
  alerts = [],
  onOpenStockOp,
  onOpenAIPlan,
  onAlertMarkRead
}) {
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const unreadAlerts = alerts.filter(a => !a.is_read);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.markAlertRead(id);
      if (onAlertMarkRead) onAlertMarkRead(id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="top-header">
      <div className="page-header-title">
        <span>{pageTitle}</span>
      </div>

      <div className="header-actions">
        {/* WebSocket Connection Status */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: isConnected ? 'var(--success)' : 'var(--danger)',
            border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'currentColor',
              boxShadow: isConnected ? '0 0 8px currentColor' : 'none'
            }}
          />
          <span>{isConnected ? 'LIVE FEED SYNC' : 'OFFLINE'}</span>
        </div>

        {/* Quick Stock Operation Action */}
        <button className="btn btn-secondary btn-sm" onClick={onOpenStockOp}>
          <ArrowLeftRight size={14} />
          <span>Stock In / Out</span>
        </button>

        {/* Quick AI Plan Action */}
        <button className="btn btn-primary btn-sm" onClick={onOpenAIPlan}>
          <Sparkles size={14} />
          <span>AI Reorder Plan</span>
        </button>

        {/* Alerts Notification Bell Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            title="System Alerts"
          >
            <Bell size={18} className={unreadAlerts.length > 0 ? 'bell-alert-anim' : ''} />
            {unreadAlerts.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'var(--danger)',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--bg-surface)'
                }}
              >
                {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
              </span>
            )}
          </button>

          {showAlertsDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                width: '360px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                backdropFilter: 'blur(20px)',
                zIndex: 60,
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Operational Alerts</span>
                <span className="badge badge-primary">{alerts.length} Total</span>
              </div>

              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {alerts.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    No alerts logged. All inventory levels optimal.
                  </div>
                ) : (
                  alerts.slice(0, 10).map((alert) => (
                    <div
                      key={alert.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: alert.is_read ? 'transparent' : 'rgba(79, 70, 229, 0.04)',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span className={`badge badge-${alert.severity.toLowerCase()}`} style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                            {alert.severity}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{alert.timestamp?.slice(11, 16)}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          {alert.message}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                          <span
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              color: 'var(--text-muted)',
                              background: 'var(--bg-main)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-subtle)'
                            }}
                          >
                            🔒 Notification Only • No Order Placed
                          </span>
                        </div>
                      </div>

                      {!alert.is_read && (
                        <button
                          onClick={(e) => handleMarkRead(alert.id, e)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                          title="Mark read"
                        >
                          <Check size={12} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
