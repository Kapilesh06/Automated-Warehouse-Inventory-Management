/**
 * src/components/StockOpModal.jsx
 * Quick Stock Operations Modal for manual Receive, Issue, Adjust, Transfer, and Return actions.
 */

import React, { useState, useEffect } from 'react';
import { X, ArrowLeftRight, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function StockOpModal({ isOpen, onClose, onSuccess, products = [], locations = [] }) {
  const [opType, setOpType] = useState('RECEIVE'); // RECEIVE, ISSUE, ADJUST, TRANSFER, RETURN
  const [productId, setProductId] = useState('');
  const [sourceLocation, setSourceLocation] = useState('1');
  const [destinationLocation, setDestinationLocation] = useState('1');
  const [quantity, setQuantity] = useState(10);
  const [actualQuantity, setActualQuantity] = useState(50);
  const [reason, setReason] = useState('Manual Stock Movement');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (products.length > 0 && !productId) {
      setProductId(products[0].id.toString());
    }
  }, [products, productId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const pId = parseInt(productId);
      if (opType === 'RECEIVE') {
        await api.stockReceive({
          product_id: pId,
          destination_location: parseInt(destinationLocation),
          quantity: parseInt(quantity),
          reference_number: referenceNumber || 'MAN-REC',
          reason: reason || 'Stock Receipt',
          note
        });
      } else if (opType === 'ISSUE') {
        await api.stockIssue({
          product_id: pId,
          source_location: parseInt(sourceLocation),
          quantity: parseInt(quantity),
          reference_number: referenceNumber || 'MAN-ISSUE',
          reason: reason || 'Stock Issue',
          note
        });
      } else if (opType === 'ADJUST') {
        await api.stockAdjust({
          product_id: pId,
          location_id: parseInt(sourceLocation),
          actual_quantity: parseInt(actualQuantity),
          reason: reason || 'Inventory Count Adjustment',
          note
        });
      } else if (opType === 'TRANSFER') {
        await api.stockTransfer({
          product_id: pId,
          source_location: parseInt(sourceLocation),
          destination_location: parseInt(destinationLocation),
          quantity: parseInt(quantity),
          reason: reason || 'Inter-facility Transfer',
          note
        });
      } else if (opType === 'RETURN') {
        await api.stockReturn({
          product_id: pId,
          destination_location: parseInt(destinationLocation),
          quantity: parseInt(quantity),
          reason: reason || 'Customer Return',
          note
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-icon-box" style={{ width: '32px', height: '32px' }}>
              <ArrowLeftRight size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Execute Stock Operation</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Updates inventory and recalculates AI multi-agent state immediately
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Operation Type Selector Pills */}
            <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', border: '1px solid var(--border-subtle)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
              {['RECEIVE', 'ISSUE', 'ADJUST', 'TRANSFER', 'RETURN'].map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setOpType(type)}
                  style={{
                    flex: 1,
                    background: opType === type ? 'var(--primary)' : 'transparent',
                    color: opType === type ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: '#f87171', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Product selection */}
            <div className="form-group">
              <label className="form-label">Product / SKU</label>
              <select
                className="form-select"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name} (Stock: {p.current_stock})
                  </option>
                ))}
              </select>
            </div>

            {/* Location Selectors */}
            {(opType === 'ISSUE' || opType === 'TRANSFER' || opType === 'ADJUST') && (
              <div className="form-group">
                <label className="form-label">{opType === 'ADJUST' ? 'Target Location' : 'Source Location'}</label>
                <select
                  className="form-select"
                  value={sourceLocation}
                  onChange={(e) => setSourceLocation(e.target.value)}
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} — {l.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(opType === 'RECEIVE' || opType === 'TRANSFER' || opType === 'RETURN') && (
              <div className="form-group">
                <label className="form-label">Destination Location</label>
                <select
                  className="form-select"
                  value={destinationLocation}
                  onChange={(e) => setDestinationLocation(e.target.value)}
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} — {l.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity */}
            {opType === 'ADJUST' ? (
              <div className="form-group">
                <label className="form-label">New Actual Physical Count</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={actualQuantity}
                  onChange={(e) => setActualQuantity(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <input
                  type="text"
                  className="form-input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Sales Fulfillment"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Reference Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. PO-981 / SO-201"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (Optional)</label>
              <input
                type="text"
                className="form-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Operational notes"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Check size={16} />
              <span>{loading ? 'Processing...' : `Submit ${opType}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
