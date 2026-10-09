/**
 * src/pages/SuppliersPage.jsx
 * Supplier directory and vendor performance tracking fulfilling Section 36 requirements.
 */

import React, { useState, useEffect } from 'react';
import { Building2, Phone, Mail, Clock, ShieldCheck, DollarSign, Eye, RefreshCw, X } from 'lucide-react';
import { api } from '../services/api';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.getSuppliers();
      setSuppliers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleInspectSupplier = async (id) => {
    try {
      setDetailLoading(true);
      const res = await api.getSupplierDetail(id);
      setSelectedSupplierDetail(res);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card" style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Supplier Directory & Vendor Reliability Matrix
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Vendor lead times, fulfillment reliability scores, active SKUs, and open commitments.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchSuppliers} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Suppliers Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {suppliers.map((s) => (
          <div
            key={s.id}
            className="card"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <span className="badge badge-primary" style={{ marginBottom: '6px' }}>{s.supplier_code}</span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reliability</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>
                    {(s.reliability_rating * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={14} color="var(--primary)" />
                  <span>Lead Time: <strong>{s.lead_time_days} Days</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={14} color="var(--text-muted)" />
                  <span>{s.email || 'orders@vendor.com'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={14} color="var(--text-muted)" />
                  <span>{s.phone || '+91 98000 00000'}</span>
                </div>
              </div>

              {/* Stats badges */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px' }}>
                <div>
                  <div className="stat-label" style={{ fontSize: '0.68rem' }}>Active SKUs</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.active_sku_count}</div>
                </div>
                <div>
                  <div className="stat-label" style={{ fontSize: '0.68rem' }}>Open POs</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.open_po_count}</div>
                </div>
                <div>
                  <div className="stat-label" style={{ fontSize: '0.68rem' }}>PO Value</div>
                  <div style={{ fontWeight: 700, color: 'var(--success)' }}>₹{s.open_po_value?.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '16px', width: '100%' }}
              onClick={() => handleInspectSupplier(s.id)}
            >
              <Eye size={14} />
              <span>Inspect Supplier Profile</span>
            </button>
          </div>
        ))}
      </div>

      {/* Supplier Detail Modal */}
      {selectedSupplierDetail && (
        <div className="modal-overlay" onClick={() => setSelectedSupplierDetail(null)}>
          <div className="modal-card" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedSupplierDetail.name}</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Code: {selectedSupplierDetail.supplier_code} • Contact: {selectedSupplierDetail.contact_person}
                </div>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setSelectedSupplierDetail(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <span className="stat-label">Address</span>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.85rem', marginTop: '4px' }}>{selectedSupplierDetail.address}</p>
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Supplied Products ({selectedSupplierDetail.products?.length || 0})
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Product Name</th>
                        <th>Standard Cost</th>
                        <th>Lead Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSupplierDetail.products?.map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{p.sku}</td>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.name}</td>
                          <td>₹{p.unit_cost?.toLocaleString()}</td>
                          <td>{p.lead_time_days} Days</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Purchase Order History ({selectedSupplierDetail.purchase_orders?.length || 0})
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>PO Number</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSupplierDetail.purchase_orders?.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No historical purchase orders.</td></tr>
                      ) : (
                        selectedSupplierDetail.purchase_orders?.map((po) => (
                          <tr key={po.id}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{po.po_number}</td>
                            <td><span className={`badge badge-${po.status.toLowerCase().replace('_', '-')}`}>{po.status}</span></td>
                            <td>{po.order_date}</td>
                            <td style={{ fontWeight: 600, color: '#34d399' }}>₹{po.total_amount?.toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedSupplierDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
