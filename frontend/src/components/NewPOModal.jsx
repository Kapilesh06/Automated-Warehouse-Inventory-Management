/**
 * src/components/NewPOModal.jsx
 * Modal to create a new Purchase Order with dynamic line items and supplier lead times.
 */

import React, { useState } from 'react';
import { X, Plus, Trash2, ShoppingCart, Check } from 'lucide-react';
import { api } from '../services/api';

export default function NewPOModal({ isOpen, onClose, onSuccess, suppliers = [], products = [] }) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id?.toString() || '1');
  const [notes, setNotes] = useState('Standard stock replenishment order');
  const [items, setItems] = useState([
    { product_id: products[0]?.id || 1, quantity_ordered: 20, unit_cost: products[0]?.unit_cost || 1000 }
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddItem = () => {
    const defaultProd = products[0] || { id: 1, unit_cost: 100 };
    setItems([...items, { product_id: defaultProd.id, quantity_ordered: 10, unit_cost: defaultProd.unit_cost }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === 'product_id') {
      const prod = products.find(p => p.id === parseInt(value));
      newItems[index].product_id = parseInt(value);
      if (prod) newItems[index].unit_cost = prod.unit_cost;
    } else if (field === 'quantity_ordered') {
      newItems[index].quantity_ordered = parseInt(value) || 1;
    } else if (field === 'unit_cost') {
      newItems[index].unit_cost = parseFloat(value) || 0;
    }
    setItems(newItems);
  };

  const totalAmount = items.reduce((acc, it) => acc + (it.quantity_ordered * it.unit_cost), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createPurchaseOrder({
        supplier_id: parseInt(supplierId),
        notes,
        items
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      alert(`Failed to create PO: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-icon-box" style={{ width: '32px', height: '32px' }}>
              <ShoppingCart size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Create Purchase Order</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Place order with certified supplier</p>
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
                <label className="form-label">Select Supplier</label>
                <select className="form-select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.supplier_code} — {s.name} (Lead: {s.lead_time_days}d)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Notes & Instructions</label>
                <input
                  type="text"
                  className="form-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Line items table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Line Items</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddItem}>
                  <Plus size={14} />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Cost (₹)</th>
                      <th>Total (₹)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td style={{ minWidth: '220px' }}>
                          <select
                            className="form-select"
                            value={it.product_id}
                            onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ width: '100px' }}>
                          <input
                            type="number"
                            min="1"
                            className="form-input"
                            value={it.quantity_ordered}
                            onChange={(e) => handleItemChange(idx, 'quantity_ordered', e.target.value)}
                          />
                        </td>
                        <td style={{ width: '130px' }}>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={it.unit_cost}
                            onChange={(e) => handleItemChange(idx, 'unit_cost', e.target.value)}
                          />
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                          ₹{(it.quantity_ordered * it.unit_cost).toLocaleString()}
                        </td>
                        <td>
                          {items.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon"
                              style={{ width: '28px', height: '28px', color: 'var(--danger)' }}
                              onClick={() => handleRemoveItem(idx)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ textAlign: 'right', marginTop: '12px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Total Order Value: <span style={{ color: 'var(--success)' }}>₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || items.length === 0}>
              <Check size={16} />
              <span>{loading ? 'Creating...' : 'Place Purchase Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
