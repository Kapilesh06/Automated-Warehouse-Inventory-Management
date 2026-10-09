/**
 * src/pages/PurchaseOrdersPage.jsx
 * Purchase Order management lifecycle page fulfilling Section 33 requirements:
 * Viewing, creating POs, receiving deliveries, and tracking line item fulfillment.
 */

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, PackageCheck, Eye, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function PurchaseOrdersPage({
  suppliers = [],
  products = [],
  locations = [],
  onOpenNewPO,
  onOpenReceivePO
}) {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedPoId, setExpandedPoId] = useState(null);

  const fetchPOs = async () => {
    try {
      setLoading(true);
      const res = await api.getPurchaseOrders({
        status: statusFilter || undefined
      });
      setPurchaseOrders(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, [statusFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top action & filter bar */}
      <div className="card" style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Filter Status:</label>
          <select
            className="form-select"
            style={{ width: '220px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses ({purchaseOrders.length})</option>
            <option value="DRAFT">DRAFT (AI Generated)</option>
            <option value="ORDERED">ORDERED (Pending Delivery)</option>
            <option value="PARTIALLY_RECEIVED">PARTIALLY RECEIVED</option>
            <option value="RECEIVED">RECEIVED (Fulfilled)</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchPOs} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={onOpenNewPO}>
            <Plus size={16} />
            <span>Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* PO Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Order Date</th>
              <th>Expected Date</th>
              <th>Total Value</th>
              <th>Line Items</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading purchase orders...</td></tr>
            ) : purchaseOrders.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>No purchase orders on file.</td></tr>
            ) : (
              purchaseOrders.map((po) => {
                const isExpanded = expandedPoId === po.id;
                const canReceive = po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'DRAFT';

                return (
                  <React.Fragment key={po.id}>
                    <tr>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                        {po.po_number}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{po.supplier_name}</td>
                      <td>
                        <span
                          className={`badge ${
                            po.status === 'RECEIVED'
                              ? 'badge-success'
                              : po.status === 'PARTIALLY_RECEIVED'
                              ? 'badge-warning'
                              : po.status === 'ORDERED'
                              ? 'badge-primary'
                              : 'badge-secondary'
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {po.order_date ? po.order_date.slice(0, 10) : ''}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {po.expected_delivery_date ? po.expected_delivery_date.slice(0, 10) : '—'}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                        ₹{po.total_amount?.toLocaleString()}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          onClick={() => setExpandedPoId(isExpanded ? null : po.id)}
                        >
                          {isExpanded ? 'Hide Items' : `View ${po.items?.length || 0} Items`}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => onOpenReceivePO(po)}
                            >
                              <PackageCheck size={14} />
                              <span>Receive Stock</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable line items sub-table */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={8} style={{ padding: '16px 24px' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
                            Line Items Breakdown for {po.po_number}
                          </div>
                          <div className="table-container" style={{ background: '#ffffff', border: '1px solid var(--border-subtle)' }}>
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>SKU</th>
                                  <th>Product Name</th>
                                  <th>Ordered</th>
                                  <th>Received</th>
                                  <th>Remaining</th>
                                  <th>Unit Cost</th>
                                  <th>Total Cost</th>
                                </tr>
                              </thead>
                              <tbody>
                                {po.items?.map((item) => (
                                  <tr key={item.id}>
                                    <td style={{ fontFamily: 'var(--font-mono)' }}>{item.sku}</td>
                                    <td style={{ color: 'var(--text-primary)' }}>{item.product_name}</td>
                                    <td>{item.quantity_ordered}</td>
                                    <td style={{ color: '#34d399', fontWeight: 600 }}>{item.quantity_received}</td>
                                    <td style={{ color: item.quantity_ordered - item.quantity_received > 0 ? '#fbbf24' : 'var(--text-muted)' }}>
                                      {item.quantity_ordered - item.quantity_received}
                                    </td>
                                    <td>₹{item.unit_cost?.toLocaleString()}</td>
                                    <td style={{ fontWeight: 600, color: '#34d399' }}>
                                      ₹{(item.quantity_ordered * item.unit_cost).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
