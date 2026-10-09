/**
 * src/components/AIReorderPlanModal.jsx
 * Full modal implementing Section 18 & 19 requirements:
 * Executive Summary, Grouped Recommended Actions, Supplier Consolidation,
 * Risk Callouts, Budget Calculator & Trade-offs, and "Create Draft Purchase Orders".
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  Building2,
  DollarSign,
  Copy,
  Check,
  PackagePlus,
  RefreshCw,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';

export default function AIReorderPlanModal({ isOpen, onClose, selectedProductIds = null, onPlanExecuted }) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [budget, setBudget] = useState(250000);
  const [priorityNote, setPriorityNote] = useState('Immediate Q4 restocking campaign');
  const [copied, setCopied] = useState(false);
  const [executingPOs, setExecutingPOs] = useState(false);
  const [poResultMsg, setPoResultMsg] = useState(null);

  const fetchPlan = async (customBudget = budget) => {
    try {
      setLoading(true);
      setPoResultMsg(null);
      const res = await api.getAIReorderPlan({
        budget: Number(customBudget),
        priority_note: priorityNote,
        product_ids: selectedProductIds
      });
      setPlan(res);
    } catch (err) {
      console.error(err);
      alert(`Failed to generate AI Reorder Plan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlan();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!plan) return;
    const text = JSON.stringify(plan, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateDraftPOs = async () => {
    try {
      setExecutingPOs(true);
      const res = await api.createDraftPOsFromPlan({
        budget: Number(budget),
        priority_note: priorityNote,
        product_ids: selectedProductIds
      });
      setPoResultMsg(`Success! Created ${res.created_pos_count} Draft Purchase Orders grouped by supplier.`);
      if (onPlanExecuted) onPlanExecuted();
    } catch (err) {
      alert(`Error creating Purchase Orders: ${err.message}`);
    } finally {
      setExecutingPOs(false);
    }
  };

  const summary = plan?.executive_summary;
  const actions = plan?.recommended_actions || {};
  const suppliers = plan?.supplier_consolidation || [];
  const riskCallouts = plan?.risk_callouts || [];
  const budgetSummary = plan?.budget_summary;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '960px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-icon-box" style={{ width: '32px', height: '32px' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                AI Automated Reorder Plan
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Multi-agent decision output synthesized from 5 collaborative ML models
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Controls: Budget & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <label className="form-label">Procurement Budget (₹)</label>
              <input
                type="number"
                className="form-input"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Enter budget limit"
              />
            </div>
            <div>
              <label className="form-label">Priority Rationale</label>
              <input
                type="text"
                className="form-input"
                value={priorityNote}
                onChange={(e) => setPriorityNote(e.target.value)}
                placeholder="Campaign notes"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <button className="btn btn-primary" onClick={() => fetchPlan(budget)} disabled={loading} style={{ width: '100%' }}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>{loading ? 'Analyzing...' : 'Recalculate Plan'}</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
              <p style={{ fontWeight: 600 }}>Agents are evaluating stock balances, lead times, and ML forecasts...</p>
            </div>
          ) : plan ? (
            <>
              {/* Executive Summary Card */}
              <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 'var(--radius-md)', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Executive Summary
                  </span>
                  <span className={`badge badge-${summary?.overall_urgency === 'EMERGENCY' ? 'danger' : 'warning'}`}>
                    Urgency: {summary?.overall_urgency}
                  </span>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '12px' }}>
                  {summary?.inventory_situation}
                </p>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  <span>🚨 Critical SKUs: <strong style={{ color: 'var(--danger)' }}>{summary?.critical_products_count}</strong></span>
                  <span>⚠️ High Risk SKUs: <strong style={{ color: 'var(--warning)' }}>{summary?.high_risk_products_count}</strong></span>
                  <span>📦 Total Units: <strong style={{ color: 'var(--text-primary)' }}>{summary?.total_units_recommended}</strong></span>
                  <span>💰 Est. Cost: <strong style={{ color: 'var(--success)' }}>₹{budgetSummary?.estimated_total_cost?.toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Budget Trade-offs */}
              {budgetSummary && (
                <div style={{ background: budgetSummary.is_within_budget ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)', border: `1px solid ${budgetSummary.is_within_budget ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, borderRadius: 'var(--radius-md)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <DollarSign size={24} color={budgetSummary.is_within_budget ? 'var(--success)' : 'var(--danger)'} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {budgetSummary.is_within_budget ? 'Within Procurement Budget' : 'Budget Ceiling Exceeded'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {budgetSummary.trade_offs}
                    </div>
                  </div>
                </div>
              )}

              {/* Recommended Actions Grouped by CRITICAL, HIGH, MEDIUM */}
              <div>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Recommended Actions by Urgency
                </h3>

                {['CRITICAL', 'HIGH', 'MEDIUM'].map((tier) => {
                  const items = actions[tier] || [];
                  if (items.length === 0) return null;

                  return (
                    <div key={tier} style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span className={`badge badge-${tier.toLowerCase()}`}>{tier} Priority</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({items.length} SKUs)</span>
                      </div>

                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Current Stock</th>
                              <th>Reorder Point</th>
                              <th>30d Demand</th>
                              <th>Open PO</th>
                              <th>Recommended</th>
                              <th>Unit Cost</th>
                              <th>Estimated Cost</th>
                              <th>Supplier</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr key={item.product_id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.product_name}</td>
                                <td>
                                  <span style={{ color: item.current_stock === 0 ? 'var(--danger)' : 'var(--text-primary)', fontWeight: 700 }}>
                                    {item.current_stock}
                                  </span>
                                </td>
                                <td>{item.reorder_point}</td>
                                <td>{item.predicted_demand}</td>
                                <td>{item.open_po_quantity}</td>
                                <td>
                                  <strong style={{ color: 'var(--primary)' }}>+{item.recommended_quantity}</strong>
                                </td>
                                <td>₹{item.unit_cost.toLocaleString()}</td>
                                <td style={{ fontWeight: 600, color: 'var(--success)' }}>₹{item.estimated_cost.toLocaleString()}</td>
                                <td>{item.supplier_name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Supplier Consolidation Section */}
              <div>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={16} color="var(--primary)" />
                  <span>Supplier Consolidation & Grouping</span>
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                  {suppliers.map((sup) => (
                    <div
                      key={sup.supplier_id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{sup.supplier_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Lead Time: {sup.lead_time_days} Days</div>
                        </div>
                        <span className="badge badge-primary">{sup.item_count} Items</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                        <span>Units: <strong>{sup.total_quantity}</strong></span>
                        <span>Total: <strong style={{ color: 'var(--success)' }}>₹{sup.total_cost.toLocaleString()}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Callouts */}
              {riskCallouts.length > 0 && (
                <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-md)', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: '#fbbf24', fontSize: '0.82rem', fontWeight: 700 }}>
                    <ShieldAlert size={16} />
                    <span>Operational Risk Callouts</span>
                  </div>
                  <ul style={{ paddingLeft: '20px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {riskCallouts.map((rc, idx) => (
                      <li key={idx}>{rc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notification Banner on Draft PO Creation */}
              {poResultMsg && (
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>
                  {poResultMsg}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleCopy} disabled={!plan}>
            {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Plan'}</span>
          </button>
          <button className="btn btn-secondary" onClick={() => fetchPlan(budget)} disabled={loading}>
            <RefreshCw size={14} />
            <span>Regenerate</span>
          </button>
          <button
            className="btn btn-success"
            onClick={handleCreateDraftPOs}
            disabled={loading || executingPOs || !plan || suppliers.length === 0}
          >
            <PackagePlus size={16} />
            <span>{executingPOs ? 'Creating...' : 'Create Draft Purchase Orders'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
