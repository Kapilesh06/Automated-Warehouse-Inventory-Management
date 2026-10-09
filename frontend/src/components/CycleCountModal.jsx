/**
 * src/components/CycleCountModal.jsx
 * Modal for creating and reconciling physical stock count campaigns.
 */

import React, { useState } from 'react';
import { X, ClipboardCheck, Check } from 'lucide-react';
import { api } from '../services/api';

export default function CycleCountModal({ isOpen, onClose, onSuccess, locations = [], products = [] }) {
  const [campaignName, setCampaignName] = useState('Q4 Warehouse Physical Audit');
  const [locationId, setLocationId] = useState('1');
  const [counts, setCounts] = useState(
    products.slice(0, 6).map(p => ({
      product_id: p.id,
      product_name: p.name,
      sku: p.sku,
      expected: p.current_stock || 50,
      actual: p.current_stock || 50
    }))
  );
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleActualChange = (idx, val) => {
    const next = [...counts];
    next[idx].actual = Math.max(0, parseInt(val) || 0);
    setCounts(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createStockCount({
        campaign_name: campaignName,
        location_id: parseInt(locationId),
        items: counts.map(c => ({
          product_id: c.product_id,
          actual_quantity: c.actual
        }))
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      alert(`Error submitting count campaign: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-icon-box" style={{ width: '32px', height: '32px' }}>
              <ClipboardCheck size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Physical Cycle Count Campaign</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Audit expected vs actual quantities and generate variances</p>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Campaign Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Audit Facility / Location</label>
                <select className="form-select" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Expected Stock</th>
                    <th>Actual Physical Count</th>
                    <th>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {counts.map((c, idx) => {
                    const variance = c.actual - c.expected;
                    return (
                      <tr key={c.product_id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          <div>{c.product_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.sku}</div>
                        </td>
                        <td>{c.expected}</td>
                        <td style={{ width: '130px' }}>
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            value={c.actual}
                            onChange={(e) => handleActualChange(idx, e.target.value)}
                          />
                        </td>
                        <td>
                          <span
                            style={{
                              fontWeight: 700,
                              color: variance < 0 ? 'var(--danger)' : variance > 0 ? 'var(--success)' : 'var(--text-muted)'
                            }}
                          >
                            {variance > 0 ? `+${variance}` : variance}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Check size={16} />
              <span>{loading ? 'Submitting...' : 'Reconcile Count Adjustments'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
