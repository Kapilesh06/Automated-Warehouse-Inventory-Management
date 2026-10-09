/**
 * frontend/src/pages/ReorderQueue.jsx
 * Dedicated Reorder Queue page fulfilling Human-in-the-Loop Multi-Agent workflow:
 * - List AI recommendations with Urgency and Status filters
 * - Review modal with full AI decision breakdown
 * - Manager Approve action (creates DRAFT Purchase Order; inventory strictly unchanged)
 * - Manager Reject action
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Building2,
  Clock,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  FileText,
  DollarSign,
  Package,
  Layers,
  Check,
  X,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import AIExplanationModal from '../components/AIExplanationModal';

export default function ReorderQueue({ onSelectItem, onQueueUpdated }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRec, setSelectedRec] = useState(null);
  const [aiExplainItem, setAiExplainItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // id of recommendation being processed
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getReorderQueue({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        urgency: urgencyFilter !== 'ALL' ? urgencyFilter : undefined
      });
      const recList = Array.isArray(res) ? res : (res?.recommendations || res?.queue || []);
      setRecommendations(recList);
    } catch (err) {
      console.error('Failed to load reorder queue:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, urgencyFilter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleApprove = async (id, customQty = null) => {
    try {
      setActionLoading(id);
      const res = await api.approveReorder(id, customQty ? { quantity: Number(customQty) } : null);
      setFeedbackMsg({
        type: 'success',
        title: 'Reorder Approved Successfully',
        text: res.message || `Draft Purchase Order created. Inventory remains unchanged at ${res.current_stock}.`,
        po_number: res.po_number,
        stock: res.current_stock
      });
      if (selectedRec && selectedRec.id === id) {
        setSelectedRec(null);
      }
      if (onQueueUpdated) onQueueUpdated();
      fetchQueue();
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this AI reorder recommendation?')) {
      return;
    }
    try {
      setActionLoading(id);
      const res = await api.rejectReorder(id);
      setFeedbackMsg({
        type: 'warning',
        title: 'Recommendation Rejected',
        text: res.message || 'Recommendation rejected. Inventory remains unchanged.',
        stock: res.current_stock
      });
      if (selectedRec && selectedRec.id === id) {
        setSelectedRec(null);
      }
      if (onQueueUpdated) onQueueUpdated();
      fetchQueue();
    } catch (err) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = recommendations.filter(r => r.status === 'PENDING_APPROVAL').length;
  const criticalCount = recommendations.filter(r => r.urgency === 'CRITICAL').length;
  const approvedCount = recommendations.filter(r => r.status === 'APPROVED' || r.status === 'PO_CREATED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner explaining Human-in-the-Loop Workflow */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(99, 102, 241, 0.02) 100%)',
          border: '1px solid rgba(79, 70, 229, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="brand-icon-box" style={{ width: '40px', height: '40px', background: 'var(--primary)' }}>
            <TrendingUp size={22} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              AI Reorder Queue (Human-in-the-Loop)
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '650px' }}>
              The multi-agent system calculates recommended reorder quantities based on real-time consumption and predicted demand.
              <strong> Approval creates a DRAFT Purchase Order; inventory is strictly preserved until manual delivery receipt.</strong>
            </p>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={fetchQueue} disabled={loading} style={{ padding: '8px 16px' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Feedback Banner after Approve/Reject */}
      {feedbackMsg && (
        <div
          style={{
            background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {feedbackMsg.type === 'success' ? (
              <CheckCircle size={20} color="var(--success)" />
            ) : (
              <AlertTriangle size={20} color="var(--warning)" />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {feedbackMsg.title}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {feedbackMsg.text}
              </div>
            </div>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Metrics Counter Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>CRITICAL URGENCY</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--danger)' }}>{criticalCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>PENDING APPROVAL</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--warning)' }}>{pendingCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>APPROVED / DRAFT PO</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--success)' }}>{approvedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Urgency:</span>
            <select
              className="form-select"
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              style={{ width: '130px', padding: '6px 10px', fontSize: '0.82rem' }}
            >
              <option value="ALL">All Urgencies</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '170px', padding: '6px 10px', fontSize: '0.82rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PO_CREATED">PO Created</option>
            </select>
          </div>
        </div>

        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{recommendations.length}</strong> recommendations
        </span>
      </div>

      {/* Section 5 Required Reorder Queue Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th style={{ textAlign: 'right' }}>Current Stock</th>
              <th style={{ textAlign: 'right' }}>Reorder Point</th>
              <th style={{ textAlign: 'right' }}>Suggested Qty</th>
              <th>Supplier</th>
              <th style={{ textAlign: 'center' }}>Urgency</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  <div>Loading recommendations...</div>
                </td>
              </tr>
            ) : recommendations.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  <ShieldCheck size={28} style={{ margin: '0 auto 8px', color: 'var(--success)' }} />
                  <div>No pending AI reorder recommendations matching your criteria.</div>
                </td>
              </tr>
            ) : (
              recommendations.map((rec) => {
                const isPending = rec.status === 'PENDING_APPROVAL';
                const isCritical = rec.urgency === 'CRITICAL';
                const isHigh = rec.urgency === 'HIGH';

                return (
                  <tr key={rec.id} style={{ background: isPending && isCritical ? 'rgba(239, 68, 68, 0.02)' : undefined }}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {rec.product_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {rec.sku}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: rec.current_stock <= rec.reorder_point ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {rec.current_stock}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {rec.reorder_point}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                      +{rec.recommended_quantity}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                        <Building2 size={14} color="var(--text-muted)" />
                        <span>{rec.supplier_name}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Est. Cost: ₹{rec.estimated_cost.toLocaleString()}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={`badge ${
                          isCritical
                            ? 'badge-danger'
                            : isHigh
                            ? 'badge-warning'
                            : 'badge-primary'
                        }`}
                        style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                      >
                        {rec.urgency}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={`badge ${
                          rec.status === 'APPROVED' || rec.status === 'PO_CREATED'
                            ? 'badge-success'
                            : rec.status === 'REJECTED'
                            ? 'badge-secondary'
                            : 'badge-warning'
                        }`}
                        style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                      >
                        {rec.status === 'PENDING_APPROVAL' ? 'Pending' : rec.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        {/* [Explain with AI] Button */}
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setAiExplainItem(rec)}
                          style={{
                            padding: '5px 10px',
                            fontSize: '0.78rem',
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            borderColor: '#4f46e5'
                          }}
                          title="Generate dynamic Gemini GenAI explanation"
                        >
                          <Sparkles size={13} />
                          <span>Explain with AI</span>
                        </button>

                        {/* [Review] Button */}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedRec(rec)}
                          style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                        >
                          <Eye size={13} />
                          <span>Review</span>
                        </button>

                        {/* [Approve] Button */}
                        {isPending && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleApprove(rec.id)}
                            disabled={actionLoading === rec.id}
                            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                          >
                            <Check size={13} />
                            <span>Approve</span>
                          </button>
                        )}

                        {/* [Reject] Button */}
                        {isPending && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleReject(rec.id)}
                            disabled={actionLoading === rec.id}
                            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                          >
                            <X size={13} />
                            <span>Reject</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Review Recommendation Modal (Section 4 & 6) */}
      {selectedRec && (
        <div className="modal-overlay" onClick={() => setSelectedRec(null)}>
          <div className="modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="brand-icon-box" style={{ width: '34px', height: '34px' }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    AI Reorder Recommendation Review
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {selectedRec.product_name} • Recommendation #{selectedRec.id}
                  </p>
                </div>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setSelectedRec(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Alert Callout */}
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <AlertTriangle size={22} color="var(--danger)" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    ⚠️ Low Stock Alert: {selectedRec.product_name} stock is below the reorder point
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Current Stock ({selectedRec.current_stock}) &lt; Reorder Point ({selectedRec.reorder_point})
                  </div>
                </div>
              </div>

              {/* Data Breakdown Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Current Stock</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)' }}>{selectedRec.current_stock} units</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Reorder Point</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedRec.reorder_point} units</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Predicted Demand</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedRec.predicted_demand} units</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Suggested Reorder Qty</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>{selectedRec.recommended_quantity} units</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Supplier</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedRec.supplier_name}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Estimated Cost</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>₹{selectedRec.estimated_cost.toLocaleString()}</div>
                </div>
              </div>

              {/* Strict Business Rule Reminder */}
              <div
                style={{
                  background: '#f1f5f9',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}
              >
                <Info size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Strict Business Rule:</strong> Approving creates a <strong>DRAFT Purchase Order</strong>. Stock does NOT increase immediately. Current stock will remain <strong>{selectedRec.current_stock}</strong> until the delivery is physically received.
                </span>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedRec(null)}>
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const itm = selectedRec;
                    setSelectedRec(null);
                    setAiExplainItem(itm);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    borderColor: '#4f46e5'
                  }}
                >
                  <Sparkles size={16} />
                  <span>Explain with AI</span>
                </button>
              </div>

              {selectedRec.status === 'PENDING_APPROVAL' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleReject(selectedRec.id)}
                    disabled={actionLoading === selectedRec.id}
                  >
                    <X size={16} />
                    <span>Reject</span>
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => handleApprove(selectedRec.id)}
                    disabled={actionLoading === selectedRec.id}
                  >
                    <Check size={16} />
                    <span>Approve Reorder</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gemini AI Explanation Modal */}
      <AIExplanationModal
        item={aiExplainItem}
        isOpen={!!aiExplainItem}
        onClose={() => setAiExplainItem(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
