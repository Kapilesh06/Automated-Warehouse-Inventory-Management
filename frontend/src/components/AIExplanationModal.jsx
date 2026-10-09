/**
 * src/components/AIExplanationModal.jsx
 * Modal displaying dynamic Gemini AI explanations for reorder recommendations.
 * Preserves strict Human-in-the-Loop decision controls.
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  AlertTriangle,
  Info,
  Check,
  RefreshCw,
  Cpu,
  ShieldCheck,
  TrendingUp,
  Package
} from 'lucide-react';
import { api } from '../services/api';

export default function AIExplanationModal({
  isOpen,
  onClose,
  item, // Can be a recommendation object or item with product_id
  onApprove,
  onReject
}) {
  const [loading, setLoading] = useState(false);
  const [explanationData, setExplanationData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && item) {
      fetchExplanation();
    } else {
      setExplanationData(null);
      setError(null);
    }
  }, [isOpen, item]);

  const fetchExplanation = async () => {
    if (!item) return;
    try {
      setLoading(true);
      setError(null);
      const payload = item.id && item.ai_decision
        ? { recommendation_id: item.id }
        : { product_id: item.product_id || item.id };
      
      const res = await api.explainReorder(payload);
      setExplanationData(res);
    } catch (err) {
      console.error('Failed to fetch AI explanation:', err);
      setError(err.message || 'Unable to load AI explanation.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  const productName = item.product_name || item.name || 'Inventory Item';
  const structured = explanationData?.structured_data;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-card"
        style={{ maxWidth: '680px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="brand-icon-box"
              style={{
                width: '38px',
                height: '38px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#ffffff'
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Explain with AI
                </h3>
                <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                  Gemini GenAI
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                {productName} • Grounded in real-time warehouse facts & multi-agent telemetry
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Key Facts Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px'
            }}
          >
            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Current Stock
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--danger)', marginTop: '2px' }}>
                {structured?.product?.current_stock ?? item.current_stock ?? 0} units
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Reorder Point
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {structured?.product?.reorder_point ?? item.reorder_point ?? 0} units
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Predicted Demand
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
                {structured?.prediction?.predicted_demand ?? item.predicted_demand ?? 'N/A'}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Recommended Qty
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                {structured?.prediction?.recommended_quantity ?? item.recommended_quantity ?? 0} units
              </div>
            </div>
          </div>

          {/* AI Explanation Content Box */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.03) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
              minHeight: '130px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Gemini GenAI Rationale
                </span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={fetchExplanation}
                disabled={loading}
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                title="Regenerate explanation"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                <span>Regenerate</span>
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: 'var(--primary)' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Gemini is analyzing inventory...</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Evaluating stock velocity, supplier lead time, and machine learning risks.
                </div>
              </div>
            ) : error ? (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>Unable to generate AI response:</div>
                <div>{error}</div>
              </div>
            ) : explanationData ? (
              <div
                style={{
                  fontSize: '0.92rem',
                  lineHeight: '1.65',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-line'
                }}
              >
                {explanationData.explanation}
              </div>
            ) : null}
          </div>

          {/* Strict Human-in-the-Loop Notice */}
          <div
            style={{
              background: '#f1f5f9',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            <ShieldCheck size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Human-in-the-Loop Governance:</strong> Gemini does not place orders or alter stock balances.
              Reviewing and approving this recommendation creates a <strong>DRAFT Purchase Order</strong>.
              Warehouse inventory will remain strictly unchanged until physical delivery is verified by the warehouse manager.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>

          {item.status === 'PENDING_APPROVAL' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              {onReject && (
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    onReject(item.id);
                    onClose();
                  }}
                >
                  <X size={15} />
                  <span>Reject</span>
                </button>
              )}
              {onApprove && (
                <button
                  className="btn btn-success"
                  onClick={() => {
                    onApprove(item.id);
                    onClose();
                  }}
                >
                  <Check size={15} />
                  <span>Approve Reorder</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
