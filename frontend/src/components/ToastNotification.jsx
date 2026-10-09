/**
 * src/components/ToastNotification.jsx
 * Floating real-time toast alert system for Reorder Point breaches and stockout notifications.
 * Strictly reinforces the policy: Notification dispatched, NO automated order placed.
 */

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, ShieldAlert, X, ExternalLink, ArrowRight, BellRing } from 'lucide-react';

// Soft audio chime using Web Audio API synthesis (no external assets needed)
function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.08, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (e) {
    // Audio context may be restricted by browser policy before first user gesture
  }
}

export function ToastContainer({
  toasts = [],
  onDismiss,
  onViewProduct,
  onNavigateReorderQueue
}) {
  const lastSoundTimeRef = useRef(0);

  // Play audio chime when new toast arrives, throttled to at most once per 2 seconds
  useEffect(() => {
    if (toasts.length > 0) {
      const now = Date.now();
      if (now - lastSoundTimeRef.current > 2000) {
        lastSoundTimeRef.current = now;
        playNotificationChime();
      }
    }
  }, [toasts.length]);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '76px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '380px',
        maxWidth: 'calc(100vw - 48px)',
        pointerEvents: 'none'
      }}
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
          onViewProduct={() => onViewProduct && onViewProduct(toast.product_id)}
          onNavigateReorderQueue={() => onNavigateReorderQueue && onNavigateReorderQueue()}
        />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss, onViewProduct, onNavigateReorderQueue }) {
  const isCritical = toast.severity === 'CRITICAL' || toast.alert_type === 'STOCKOUT' || toast.current_stock <= 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const borderColor = isCritical ? 'var(--danger)' : 'var(--warning)';
  const bgColor = isCritical ? '#fff5f5' : '#fffbeb';
  const iconColor = isCritical ? 'var(--danger)' : 'var(--warning)';
  const badgeBg = isCritical ? 'rgba(220, 38, 38, 0.12)' : 'rgba(217, 119, 6, 0.12)';
  const badgeColor = isCritical ? 'var(--danger)' : 'var(--warning)';

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: 'var(--bg-surface)',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.05)',
        padding: '14px 16px',
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top highlight bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: isCritical
            ? 'linear-gradient(90deg, var(--danger), #f87171)'
            : 'linear-gradient(90deg, var(--warning), #fbbf24)'
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px'
          }}
        >
          {isCritical ? (
            <ShieldAlert size={20} color={iconColor} />
          ) : (
            <AlertTriangle size={20} color={iconColor} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: isCritical ? 'var(--danger)' : 'var(--warning)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <BellRing size={13} />
              {isCritical ? 'CRITICAL STOCK ALERT' : 'REORDER POINT BREACHED'}
            </span>

            <button
              onClick={onDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>

          <div
            style={{
              fontSize: '0.88rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginTop: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {toast.product_name}
          </div>

          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              marginTop: '2px',
              lineHeight: 1.4
            }}
          >
            Current Stock:{' '}
            <strong style={{ color: isCritical ? 'var(--danger)' : 'var(--warning)' }}>
              {toast.current_stock} units
            </strong>{' '}
            (Reorder Threshold: <strong>{toast.reorder_point}</strong>)
          </div>

          {/* Explicit Policy Pill: NO ORDER PLACED */}
          <div
            style={{
              marginTop: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: badgeBg,
              color: badgeColor,
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              border: `1px solid ${borderColor}44`
            }}
          >
            <span>🔒 Notification Only • No Order Placed</span>
          </div>

          {/* Quick Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '10px'
            }}
          >
            {toast.product_id && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={onViewProduct}
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  height: '26px'
                }}
              >
                <ExternalLink size={12} />
                <span>View Product</span>
              </button>
            )}

            <button
              className="btn btn-secondary btn-sm"
              onClick={onNavigateReorderQueue}
              style={{
                fontSize: '0.75rem',
                padding: '3px 8px',
                height: '26px'
              }}
            >
              <span>Reorder Queue</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
