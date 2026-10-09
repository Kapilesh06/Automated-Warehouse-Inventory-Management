/**
 * src/pages/StockOpsPage.jsx
 * Dedicated Stock In / Out Operations Console fulfilling Section 32 requirements.
 */

import React, { useState } from 'react';
import { Layers, ArrowDownLeft, ArrowUpRight, Repeat, Sliders, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function StockOpsPage({ products = [], locations = [], onTransactionSuccess }) {
  const [opType, setOpType] = useState('RECEIVE');
  const [productId, setProductId] = useState(products[0]?.id?.toString() || '1');
  const [sourceLocation, setSourceLocation] = useState('1');
  const [destinationLocation, setDestinationLocation] = useState('1');
  const [quantity, setQuantity] = useState(10);
  const [actualQuantity, setActualQuantity] = useState(50);
  const [reason, setReason] = useState('Inbound Replenishment');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const selectedProductObj = products.find((p) => p.id === parseInt(productId)) || products[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setLoading(true);

    try {
      const pId = parseInt(productId);
      let res;
      if (opType === 'RECEIVE') {
        res = await api.stockReceive({
          product_id: pId,
          destination_location: parseInt(destinationLocation),
          quantity: parseInt(quantity),
          reference_number: referenceNumber || 'REC-DOC',
          reason: reason || 'Goods Inward',
          note
        });
      } else if (opType === 'ISSUE') {
        res = await api.stockIssue({
          product_id: pId,
          source_location: parseInt(sourceLocation),
          quantity: parseInt(quantity),
          reference_number: referenceNumber || 'ISSUE-DOC',
          reason: reason || 'Sales Dispatch',
          note
        });
      } else if (opType === 'ADJUST') {
        res = await api.stockAdjust({
          product_id: pId,
          location_id: parseInt(sourceLocation),
          actual_quantity: parseInt(actualQuantity),
          reason: reason || 'Inventory Reconciliation',
          note
        });
      } else if (opType === 'TRANSFER') {
        res = await api.stockTransfer({
          product_id: pId,
          source_location: parseInt(sourceLocation),
          destination_location: parseInt(destinationLocation),
          quantity: parseInt(quantity),
          reason: reason || 'Branch Movement',
          note
        });
      } else if (opType === 'RETURN') {
        res = await api.stockReturn({
          product_id: pId,
          destination_location: parseInt(destinationLocation),
          quantity: parseInt(quantity),
          reason: reason || 'Customer Return',
          note
        });
      }

      setSuccessMsg(
        `Success: Processed ${opType} for ${selectedProductObj?.name}. New Stock: ${res.new_stock} units. Decision: ${res.recommendation}.`
      );
      if (onTransactionSuccess) onTransactionSuccess();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const opsConfig = [
    { type: 'RECEIVE', icon: ArrowDownLeft, label: 'RECEIVE Stock', desc: 'Add incoming inventory from suppliers or cross-docks' },
    { type: 'ISSUE', icon: ArrowUpRight, label: 'ISSUE Stock', desc: 'Deduct inventory for customer orders and dispatches' },
    { type: 'TRANSFER', icon: Repeat, label: 'TRANSFER Stock', desc: 'Move inventory between warehouses and fulfillment hubs' },
    { type: 'ADJUST', icon: Sliders, label: 'ADJUST Stock', desc: 'Reconcile stock count discrepancies' },
    { type: 'RETURN', icon: RotateCcw, label: 'RETURN Stock', desc: 'Restock approved customer returns and RMAs' }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
      {/* Left: Operation Selector & Explanation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Layers size={18} color="var(--primary-light)" />
              <span>Select Operation Type</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {opsConfig.map((item) => {
              const Icon = item.icon;
              const isSelected = opType === item.type;
              return (
                <div
                  key={item.type}
                  onClick={() => setOpType(item.type)}
                  style={{
                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected ? '#fff' : 'var(--primary-light)'
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Product Stock Card */}
        {selectedProductObj && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: '12px' }}>
              Selected SKU Telemetry
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedProductObj.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              SKU: {selectedProductObj.sku}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px' }}>
                <span className="stat-label">Current Stock</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {selectedProductObj.current_stock}
                </div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px' }}>
                <span className="stat-label">Reorder Point</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)', marginTop: '4px' }}>
                  {selectedProductObj.reorder_point}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Interactive Execution Form */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Execute {opType}</div>
            <div className="card-subtitle">Changes persist directly to SQLite and trigger the 5-Agent pipeline</div>
          </div>
          <span className="badge badge-primary">{opType} Mode</span>
        </div>

        {successMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: '#34d399', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: '#f87171', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

          {(opType === 'ISSUE' || opType === 'TRANSFER' || opType === 'ADJUST') && (
            <div className="form-group">
              <label className="form-label">{opType === 'ADJUST' ? 'Facility Being Audited' : 'Source Facility'}</label>
              <select
                className="form-select"
                value={sourceLocation}
                onChange={(e) => setSourceLocation(e.target.value)}
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
                ))}
              </select>
            </div>
          )}

          {(opType === 'RECEIVE' || opType === 'TRANSFER' || opType === 'RETURN') && (
            <div className="form-group">
              <label className="form-label">Destination Facility</label>
              <select
                className="form-select"
                value={destinationLocation}
                onChange={(e) => setDestinationLocation(e.target.value)}
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
                ))}
              </select>
            </div>
          )}

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
              />
            </div>
            <div className="form-group">
              <label className="form-label">Reference Number</label>
              <input
                type="text"
                className="form-input"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. DOC-8472"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Provide context on batch or condition..."
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '12px', fontSize: '0.95rem' }}>
            <Check size={18} />
            <span>{loading ? 'Executing Agents...' : `Commit ${opType} Transaction`}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
