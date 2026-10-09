/**
 * src/components/ReceivePOModal.jsx
 * Modal for receiving purchase order deliveries, replenishing inventory and recalculating AI models.
 */

import React, { useState } from 'react';
import { X, Check, PackageCheck, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function ReceivePOModal({ po, isOpen, onClose, onSuccess, locations = [] }) {
  const [selectedItemId, setSelectedItemId] = useState(po?.items[0]?.id?.toString() || '');
  const [receiveQty, setReceiveQty] = useState(1);
  const [locationId, setLocationId] = useState('1');
  const [referenceNumber, setReferenceNumber] = useState(po?.po_number ? `INV-${po.po_number.replace('PO-', '')}` : 'INV-1001');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !po) return null;

  const currentItem = po.items.find(it => it.id === parseInt(selectedItemId)) || po.items[0];
  const remaining = currentItem ? currentItem.quantity_ordered - currentItem.quantity_received : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.receivePOItem(po.id, {
        item_id: parseInt(selectedItemId || po.items[0]?.id),
        quantity_to_receive: parseInt(receiveQty),
        location_id: parseInt(locationId),
        reference_number: referenceNumber || 'INV-1001'
      });
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
      <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-icon-box" style={{ width: '32px', height: '32px' }}>
              <PackageCheck size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Receive Purchase Order</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{po.po_number} • {po.supplier_name}</p>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: '#f87171', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Line Item to Receive</label>
              <select
                className="form-select"
                value={selectedItemId}
                onChange={(e) => {
                  setSelectedItemId(e.target.value);
                  const it = po.items.find(i => i.id === parseInt(e.target.value));
                  if (it) setReceiveQty(Math.max(1, it.quantity_ordered - it.quantity_received));
                }}
              >
                {po.items.map(it => (
                  <option key={it.id} value={it.id}>
                    {it.sku} — {it.product_name} (Ordered: {it.quantity_ordered}, Received: {it.quantity_received})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Destination Facility / Warehouse</label>
              <select
                className="form-select"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                {locations.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.code} — {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Quantity to Receive (Remaining: {remaining})
              </label>
              <input
                type="number"
                min="1"
                max={remaining}
                className="form-input"
                value={receiveQty}
                onChange={(e) => setReceiveQty(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reference Number / Invoice Number</label>
              <input
                type="text"
                className="form-input"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. INV-1001"
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={loading || remaining <= 0}>
              <Check size={16} />
              <span>{loading ? 'Receiving...' : 'Confirm Receipt'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
