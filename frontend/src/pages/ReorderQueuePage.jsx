/**
 * src/pages/ReorderQueuePage.jsx
 * Calculated Reorder Queue page fulfilling Section 34 specifications:
 * Prioritized table (CRITICAL, HIGH, MEDIUM), item multi-selection, and Draft PO triggers.
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Sparkles,
  PackagePlus,
  RefreshCw,
  CheckSquare,
  Square,
  AlertTriangle,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';

export default function ReorderQueuePage({ onOpenAIPlan, onSelectItem, onQueueUpdated }) {
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [creatingPOs, setCreatingPOs] = useState(false);
  const [msg, setMsg] = useState(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.getReorderQueue();
      setQueueData(res);
      // Select all by default
      if (res.queue) {
        setSelectedIds(res.queue.map(i => i.product_id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const queue = queueData?.queue || [];

  const handleToggleSelectAll = () => {
    if (selectedIds.length === queue.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(queue.map(i => i.product_id));
    }
  };

  const handleToggleOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCreatePOs = async () => {
    if (selectedIds.length === 0) {
      alert('Please select at least one item from the queue.');
      return;
    }
    try {
      setCreatingPOs(true);
      const res = await api.createDraftPOsFromPlan({
        product_ids: selectedIds
      });
      if (res.created_pos_count > 0) {
        setMsg(`Success: Created ${res.created_pos_count} Draft Purchase Order(s) for ${selectedIds.length} item(s).`);
      } else {
        setMsg(`Notice: No draft orders created. Selected items may already have active orders in pipeline.`);
      }
      if (onQueueUpdated) onQueueUpdated();
      fetchQueue();
    } catch (err) {
      alert(`Error creating Purchase Orders: ${err.message}`);
    } finally {
      setCreatingPOs(false);
    }
  };

  const selectedItems = queue.filter(q => selectedIds.includes(q.product_id));
  const totalSelectedCost = selectedItems.reduce((acc, it) => acc + it.estimated_cost, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Policy Notification Callout */}
      <div
        style={{
          background: 'rgba(79, 70, 229, 0.05)',
          border: '1px solid rgba(79, 70, 229, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.84rem',
          color: 'var(--text-secondary)'
        }}
      >
        <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
          <ShieldCheck size={20} />
        </div>
        <div>
          <strong style={{ color: 'var(--primary-dark)' }}>Active System Policy: </strong>
          Automated order placement is <strong>DISABLED</strong>. When products run out of or breach their reorder point, live notifications are dispatched to managers and listed here for review. No orders are placed automatically.
        </div>
      </div>

      {/* Top Banner & Summary */}
      <div className="card" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Calculated Replenishment Queue
            </h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Identifies items breaching safety or reorder thresholds, filtered for open purchase orders.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={fetchQueue} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Queue</span>
          </button>

          <button className="btn btn-primary" onClick={() => onOpenAIPlan(selectedIds)}>
            <Sparkles size={16} />
            <span>AI Reorder Plan</span>
          </button>

          <button
            className="btn btn-success"
            onClick={handleCreatePOs}
            disabled={creatingPOs || selectedIds.length === 0}
          >
            <PackagePlus size={16} />
            <span>{creatingPOs ? 'Creating...' : `Create POs (${selectedIds.length})`}</span>
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)', padding: '12px 18px', color: '#065f46', fontSize: '0.88rem', fontWeight: 600 }}>
          {msg}
        </div>
      )}

      {/* Selected Total Floating Bar */}
      <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={handleToggleSelectAll}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {selectedIds.length === queue.length ? <CheckSquare size={14} color="var(--primary)" /> : <Square size={14} />}
            <span>{selectedIds.length === queue.length ? 'Deselect All' : 'Select All'}</span>
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Selected: <strong style={{ color: 'var(--text-primary)' }}>{selectedIds.length}</strong> of {queue.length} items
          </span>
        </div>

        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
          Selected Procurement Value: <strong style={{ color: 'var(--success)' }}>₹{totalSelectedCost.toLocaleString()}</strong>
        </div>
      </div>

      {/* Reorder Queue Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Product / SKU</th>
              <th>Urgency</th>
              <th>Current Stock</th>
              <th>Reorder Point</th>
              <th>30d Demand</th>
              <th>Open PO</th>
              <th>Suggested Qty</th>
              <th>Unit Cost</th>
              <th>Estimated Cost</th>
              <th>Supplier</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Calculating inventory reorder requirements...</td></tr>
            ) : queue.length === 0 ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>All SKUs currently meet safe inventory levels.</td></tr>
            ) : (
              queue.map((item) => {
                const isChecked = selectedIds.includes(item.product_id);
                return (
                  <tr
                    key={item.product_id}
                    style={{ background: isChecked ? 'rgba(79, 70, 229, 0.05)' : 'transparent' }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleOne(item.product_id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                    <td style={{ cursor: 'pointer' }} onClick={() => onSelectItem && onSelectItem(item.product_id)}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.product_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.sku}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${item.urgency.toLowerCase()}`}>
                        {item.urgency}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: item.current_stock === 0 ? 'var(--danger)' : 'var(--warning)'
                        }}
                      >
                        {item.current_stock}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{item.reorder_point}</td>
                    <td>{item.predicted_demand}</td>
                    <td style={{ color: item.open_po_quantity > 0 ? '#38bdf8' : 'var(--text-muted)' }}>
                      {item.open_po_quantity}
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--primary-light)', fontSize: '0.95rem' }}>
                        +{item.recommended_quantity}
                      </span>
                    </td>
                    <td>₹{item.unit_cost?.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: '#34d399' }}>
                      ₹{item.estimated_cost?.toLocaleString()}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{item.supplier_name}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
