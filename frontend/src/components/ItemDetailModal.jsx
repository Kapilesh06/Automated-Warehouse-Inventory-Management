/**
 * src/components/ItemDetailModal.jsx
 * Product Detail Modal fulfilling Section 30 specifications:
 * Metadata, Stock Progress Bar, Tabs (Stock by Location, Transactions, POs),
 * and dynamic AI Reorder Recommendation card.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Boxes,
  MapPin,
  History,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';

export default function ItemDetailModal({ productId, isOpen, onClose }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('locations'); // locations, transactions, pos

  useEffect(() => {
    if (productId && isOpen) {
      setLoading(true);
      api.getProductDetail(productId)
        .then((res) => setProduct(res))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [productId, isOpen]);

  if (!isOpen || !productId) return null;

  const pred = product?.latest_prediction;
  const currentStock = product?.current_stock || 0;
  const reorderPoint = product?.reorder_point || 20;
  const safetyStock = product?.safety_stock || 10;

  // Calculate stock progress percentage against 2x reorder point
  const stockRatio = Math.min(100, Math.round((currentStock / (reorderPoint * 2)) * 100));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '860px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-icon-box" style={{ width: '36px', height: '36px' }}>
              <Boxes size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {product?.name || 'Loading...'}
                </h2>
                {product && (
                  <span className={`badge badge-${product.stock_status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {product.stock_status}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                SKU: {product?.sku} • Barcode: {product?.barcode}
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading || !product ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading product intelligence details...
            </div>
          ) : (
            <>
              {/* Product Specifications Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div className="card" style={{ padding: '12px' }}>
                  <div className="stat-label">Category</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginTop: '2px' }}>{product.category_name}</div>
                </div>
                <div className="card" style={{ padding: '12px' }}>
                  <div className="stat-label">Supplier</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginTop: '2px' }}>{product.supplier_name}</div>
                </div>
                <div className="card" style={{ padding: '12px' }}>
                  <div className="stat-label">Unit Cost</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginTop: '2px' }}>₹{product.unit_cost?.toLocaleString()}</div>
                </div>
                <div className="card" style={{ padding: '12px' }}>
                  <div className="stat-label">Selling Price</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginTop: '2px' }}>₹{product.selling_price?.toLocaleString()}</div>
                </div>
                <div className="card" style={{ padding: '12px' }}>
                  <div className="stat-label">Gross Margin</div>
                  <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.9rem', marginTop: '2px' }}>{product.margin}%</div>
                </div>
                <div className="card" style={{ padding: '12px' }}>
                  <div className="stat-label">Lead Time</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginTop: '2px' }}>{product.lead_time_days} Days</div>
                </div>
              </div>

              {/* Stock Level Progress Bar */}
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Current Stock: <strong style={{ color: currentStock <= reorderPoint ? 'var(--warning)' : '#34d399' }}>{currentStock} {product.unit}</strong>
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                    <span>Safety Stock: <strong>{safetyStock}</strong></span>
                    <span>Reorder Point: <strong>{reorderPoint}</strong></span>
                  </div>
                </div>

                <div className="sim-progress-bar-bg" style={{ height: '10px' }}>
                  <div
                    className="sim-progress-bar-fill"
                    style={{
                      width: `${stockRatio}%`,
                      background: currentStock <= safetyStock
                        ? 'var(--danger)'
                        : currentStock <= reorderPoint
                        ? 'var(--warning)'
                        : 'var(--success)'
                    }}
                  />
                </div>
              </div>

              {/* AI Reorder Recommendation Callout */}
              {pred && (
                <div
                  style={{
                    background: pred.recommendation === 'REORDER NOW' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                    border: `1px solid ${pred.recommendation === 'REORDER NOW' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '18px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={18} color="var(--primary)" />
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        AI REORDER RECOMMENDATION
                      </span>
                    </div>
                    <span
                      className={`badge badge-${
                        pred.recommendation === 'REORDER NOW'
                          ? 'danger'
                          : pred.recommendation === 'REORDER SOON'
                          ? 'warning'
                          : 'success'
                      }`}
                    >
                      Decision: {pred.recommendation}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Predicted 30d Demand:</span>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{pred.predicted_demand} units</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>7d Velocity Demand:</span>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{pred.short_term_demand} units</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Stockout Risk:</span>
                      <div style={{ color: pred.stockout_risk === 'HIGH' ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                        {pred.stockout_risk}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Recommended Reorder:</span>
                      <div style={{ color: 'var(--primary)', fontWeight: 700 }}>
                        {pred.recommended_reorder_quantity} units
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs: Location Stock, Transactions, POs */}
              <div>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', gap: '8px', marginBottom: '16px' }}>
                  <button
                    className={`btn ${activeTab === 'locations' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setActiveTab('locations')}
                  >
                    <MapPin size={14} />
                    <span>Stock by Location ({product.stock_by_location?.length || 0})</span>
                  </button>
                  <button
                    className={`btn ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setActiveTab('transactions')}
                  >
                    <History size={14} />
                    <span>Transaction History ({product.transaction_history?.length || 0})</span>
                  </button>
                  <button
                    className={`btn ${activeTab === 'pos' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setActiveTab('pos')}
                  >
                    <ShoppingCart size={14} />
                    <span>PO History ({product.purchase_order_history?.length || 0})</span>
                  </button>
                </div>

                {/* Tab 1: Stock by Location */}
                {activeTab === 'locations' && (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Facility Code</th>
                          <th>Facility Name</th>
                          <th>Current Stock Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.stock_by_location?.map((loc) => (
                          <tr key={loc.location_id}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{loc.location_code}</td>
                            <td>{loc.location_name}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: loc.quantity > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {loc.quantity} {product.unit}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tab 2: Transaction History */}
                {activeTab === 'transactions' && (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Tx ID</th>
                          <th>Type</th>
                          <th>Quantity</th>
                          <th>Timestamp</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.transaction_history?.length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No recent transactions recorded.</td></tr>
                        ) : (
                          product.transaction_history?.map((tx) => (
                            <tr key={tx.id}>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>{tx.transaction_id}</td>
                              <td>
                                <span className={`badge ${tx.transaction_type === 'ISSUE' ? 'badge-danger' : 'badge-success'}`}>
                                  {tx.transaction_type}
                                </span>
                              </td>
                              <td style={{ fontWeight: 600 }}>{tx.quantity}</td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{tx.timestamp}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{tx.reason}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tab 3: PO History */}
                {activeTab === 'pos' && (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>PO Number</th>
                          <th>Status</th>
                          <th>Order Date</th>
                          <th>Ordered</th>
                          <th>Received</th>
                          <th>Unit Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.purchase_order_history?.length === 0 ? (
                          <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No purchase orders on file.</td></tr>
                        ) : (
                          product.purchase_order_history?.map((po, idx) => (
                            <tr key={idx}>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{po.po_number}</td>
                              <td>
                                <span className={`badge badge-${po.status.toLowerCase().replace('_', '-')}`}>
                                  {po.status}
                                </span>
                              </td>
                              <td>{po.order_date}</td>
                              <td>{po.quantity_ordered}</td>
                              <td>{po.quantity_received}</td>
                              <td>₹{po.unit_cost?.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
