/**
 * src/pages/Dashboard.jsx
 * Real-Time Warehouse Inventory Dashboard with KPI Cards, 7 Recharts Visualizations,
 * AI Reorder Quick Panel, and Live Activity Streams.
 */

import React, { useState } from 'react';
import {
  Boxes,
  DollarSign,
  AlertTriangle,
  PackageX,
  ShoppingCart,
  Activity,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  Check,
  CheckCircle2,
  X,
  Building2,
  Calendar,
  FileText,
  Info,
  Clock,
  Bot
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import AIExplanationModal from '../components/AIExplanationModal';

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

export default function Dashboard({ stats, onOpenAIPlan, onSelectItem, onRefresh, onNavigate }) {
  const [approvingId, setApprovingId] = useState(null);
  const [reviewItem, setReviewItem] = useState(null);
  const [orderQty, setOrderQty] = useState(0);
  const [approvalSuccess, setApprovalSuccess] = useState(null);
  const [optimisticApprovedIds, setOptimisticApprovedIds] = useState([]);
  const [aiExplainItem, setAiExplainItem] = useState(null);
  const [geminiSummaryText, setGeminiSummaryText] = useState(null);
  const [geminiSummaryLoading, setGeminiSummaryLoading] = useState(false);

  const handleGenerateGeminiSummary = async () => {
    try {
      setGeminiSummaryLoading(true);
      const res = await api.getDailySummary();
      setGeminiSummaryText(res.summary);
    } catch (err) {
      alert(`Failed to generate AI summary: ${err.message}`);
    } finally {
      setGeminiSummaryLoading(false);
    }
  };

  if (!stats) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
        <p>Loading real-time warehouse intelligence...</p>
      </div>
    );
  }

  const charts = stats.charts || {};

  const handleOpenReview = (alertItem, e) => {
    if (e) e.stopPropagation();
    setReviewItem(alertItem);
    setOrderQty(alertItem.recommended_quantity || 10);
  };

  const handleQuickApprove = async (alertItem, e) => {
    if (e) e.stopPropagation();
    try {
      setApprovingId(alertItem.id);
      const res = await api.approveReorder(alertItem.id);
      setOptimisticApprovedIds((prev) => [...prev, alertItem.id]);
      setApprovalSuccess({
        productName: alertItem.product_name,
        poNumber: res.po_number || 'PO-DRAFT',
        poId: res.po_id,
        currentStock: res.current_stock ?? alertItem.current_stock,
        quantity: alertItem.recommended_quantity,
        supplierName: alertItem.supplier_name,
        cost: alertItem.estimated_cost
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setApprovingId(null);
    }
  };

  const handleModalApprove = async () => {
    if (!reviewItem) return;
    try {
      setApprovingId(reviewItem.id);
      const finalQty = Number(orderQty) > 0 ? Number(orderQty) : reviewItem.recommended_quantity;
      const res = await api.approveReorder(reviewItem.id, { quantity: finalQty });
      setOptimisticApprovedIds((prev) => [...prev, reviewItem.id]);
      const savedItem = reviewItem;
      const unitCost = savedItem.estimated_cost && savedItem.recommended_quantity
        ? (savedItem.estimated_cost / savedItem.recommended_quantity)
        : 0;
      setReviewItem(null);
      setApprovalSuccess({
        productName: savedItem.product_name,
        poNumber: res.po_number || 'PO-DRAFT',
        poId: res.po_id,
        currentStock: res.current_stock ?? savedItem.current_stock,
        quantity: finalQty,
        supplierName: savedItem.supplier_name,
        cost: Math.round(finalQty * unitCost)
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setApprovingId(null);
    }
  };

  const handleModalReject = async () => {
    if (!reviewItem) return;
    if (!window.confirm(`Are you sure you want to reject the reorder recommendation for '${reviewItem.product_name}'?`)) {
      return;
    }
    try {
      setApprovingId(reviewItem.id);
      await api.rejectReorder(reviewItem.id);
      setOptimisticApprovedIds((prev) => [...prev, reviewItem.id]);
      setReviewItem(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setApprovingId(null);
    }
  };

  const displayAlerts = (stats.ai_reorder_alerts || []).filter(
    (a) => !optimisticApprovedIds.includes(a.id)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 0. DEDICATED AI INVENTORY INSIGHTS (GEMINI GENAI) */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.06) 0%, rgba(147, 51, 234, 0.02) 100%)',
          border: '1px solid rgba(79, 70, 229, 0.25)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              className="brand-icon-box"
              style={{
                width: '38px',
                height: '38px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#ffffff'
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  AI Inventory Insights
                </h3>
                <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                  Gemini GenAI
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Grounded natural-language reasoning derived from real-time stock balances, ML forecasts, and 5-agent decisions.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleGenerateGeminiSummary}
              disabled={geminiSummaryLoading}
              style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            >
              <RefreshCw size={14} className={geminiSummaryLoading ? 'animate-spin' : ''} />
              <span>{geminiSummaryLoading ? 'Analyzing...' : 'Generate AI Summary'}</span>
            </button>

            {onNavigate && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onNavigate('inventory-ai')}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.82rem',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  borderColor: '#4f46e5'
                }}
              >
                <Bot size={14} />
                <span>Open AI Assistant</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>High Risk Products</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--danger)', marginTop: '2px' }}>
              {stats.high_stockout_risk_count ?? 0}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Flagged by ML Model 3</span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Low Stock Products</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--warning)', marginTop: '2px' }}>
              {stats.low_stock_items ?? stats.low_stock_count ?? 0}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stock &le; Reorder Point</span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Pending Reorder Recommendations</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
              {stats.pending_ai_recommendations ?? 0}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Human Review Required</span>
          </div>
        </div>

        {/* Generated Gemini Summary Preview */}
        {geminiSummaryText && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid rgba(79, 70, 229, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              fontSize: '0.88rem',
              lineHeight: '1.65',
              color: 'var(--text-primary)',
              whiteSpace: 'pre-line'
            }}
          >
            {geminiSummaryText}
          </div>
        )}
      </div>

      {/* 1. AI REORDER PLAN BANNER (Section 28) */}
      <div className="ai-plan-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Sparkles size={20} color="var(--primary)" />
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e1b4b', letterSpacing: '-0.01em' }}>
              AI INVENTORY REORDER INTELLIGENCE
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '650px', lineHeight: 1.5 }}>
            Continuous multi-agent monitoring has identified shortage exposures.
            Review priority classifications and generate consolidated draft orders.
          </p>

          <div style={{ display: 'flex', gap: '20px', marginTop: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-danger">Critical: {stats.out_of_stock_count}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-warning">Low Stock: {stats.low_stock_count}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-primary">High Risk: {stats.high_stockout_risk_count}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              Est. Reorder Cost: <strong style={{ color: '#059669' }}>₹{(stats.low_stock_count * 18500).toLocaleString()}</strong>
            </div>
          </div>
        </div>

        <button className="btn btn-primary" onClick={onOpenAIPlan} style={{ padding: '12px 24px', fontSize: '0.92rem' }}>
          <Sparkles size={18} />
          <span>Generate AI Reorder Plan</span>
        </button>
      </div>

      {/* SECTION 11: SPECIFIED REORDER & INVENTORY KPIS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Pending AI Recommendations</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--warning)' }}>{stats.pending_ai_recommendations ?? 0}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Awaiting Manager Review</span>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Approved Reorders</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)' }}>{stats.approved_reorders ?? 0}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Converted to Draft POs</span>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Pending Purchase Orders</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>{stats.pending_purchase_orders ?? 0}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DRAFT / ORDERED in Flight</span>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Orders Received</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669' }}>{stats.orders_received ?? 0}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Stock Manually Confirmed</span>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Low Stock Items</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--warning)' }}>{stats.low_stock_items ?? stats.low_stock_count ?? 0}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Stock &le; Reorder Point</span>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Out of Stock Items</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger)' }}>{stats.out_of_stock_items ?? stats.out_of_stock_count ?? 0}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Zero Balance Alert</span>
        </div>
      </div>

      {/* SECTION 11: DEDICATED AI REORDER ALERTS PANEL */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-icon-box" style={{ width: '32px', height: '32px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                AI REORDER ALERTS
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                Continuous agent evaluation detected items needing replenishment. Review recommendations and approve Draft POs.
              </p>
            </div>
          </div>
          {onNavigate && (
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('reorder-queue')}>
              <span>Open Reorder Queue</span>
              <ArrowUpRight size={14} />
            </button>
          )}
        </div>

        {(!displayAlerts || displayAlerts.length === 0) ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
            No pending AI reorder alerts at this time. All stock levels satisfy reorder thresholds.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {displayAlerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  background: alert.urgency === 'CRITICAL' ? 'rgba(239, 68, 68, 0.04)' : '#f8fafc',
                  border: `1px solid ${alert.urgency === 'CRITICAL' ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'box-shadow 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: alert.urgency === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {alert.urgency === 'CRITICAL' ? '🔴 Critical' : alert.urgency === 'HIGH' ? '🟠 High' : '🟡 Medium'}
                  </span>
                  <button
                    type="button"
                    className="badge badge-warning"
                    style={{
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      border: '1px solid rgba(245, 158, 11, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#b45309',
                      fontWeight: 600
                    }}
                    title="Click to review and approve this reorder"
                    onClick={(e) => handleOpenReview(alert, e)}
                  >
                    <Clock size={11} />
                    <span>Pending Approval</span>
                  </button>
                </div>

                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {alert.product_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Stock: <strong style={{ color: 'var(--danger)' }}>{alert.current_stock}</strong> • Reorder Point: <strong>{alert.reorder_point}</strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '2px', fontWeight: 600 }}>
                    Recommended: +{alert.recommended_quantity} units
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Supplier: {alert.supplier_name} • Est: ₹{alert.estimated_cost?.toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{
                      padding: '6px 8px',
                      fontSize: '0.75rem',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      borderColor: '#4f46e5'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAiExplainItem(alert);
                    }}
                    title="Explain recommendation with Gemini GenAI"
                  >
                    <Sparkles size={12} />
                    <span>Explain</span>
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem', justifyContent: 'center' }}
                    onClick={(e) => handleOpenReview(alert, e)}
                  >
                    <span>Review</span>
                  </button>
                  <button
                    className="btn btn-success btn-sm"
                    style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem', justifyContent: 'center' }}
                    disabled={approvingId === alert.id}
                    onClick={(e) => handleQuickApprove(alert, e)}
                  >
                    {approvingId === alert.id ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        <span>Approving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={12} />
                        <span>Approve</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. SUMMARY KPI CARDS (Section 26) */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Total SKUs</span>
            <div className="stat-icon"><Boxes size={18} /></div>
          </div>
          <div className="stat-value">{stats.total_skus}</div>
          <div className="stat-meta">Across 8 Active Categories</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Total Stock Value</span>
            <div className="stat-icon" style={{ color: '#059669' }}><DollarSign size={18} /></div>
          </div>
          <div className="stat-value">₹{stats.total_stock_value?.toLocaleString()}</div>
          <div className="stat-meta">Valued at Current Unit Cost</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Low Stock SKUs</span>
            <div className="stat-icon" style={{ color: 'var(--warning)' }}><AlertTriangle size={18} /></div>
          </div>
          <div className="stat-value" style={{ color: stats.low_stock_count > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
            {stats.low_stock_count}
          </div>
          <div className="stat-meta">Below Reorder Point</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Out of Stock</span>
            <div className="stat-icon" style={{ color: 'var(--danger)' }}><PackageX size={18} /></div>
          </div>
          <div className="stat-value" style={{ color: stats.out_of_stock_count > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
            {stats.out_of_stock_count}
          </div>
          <div className="stat-meta">Critical Stockout Exposure</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Open Purchase Orders</span>
            <div className="stat-icon" style={{ color: '#818cf8' }}><ShoppingCart size={18} /></div>
          </div>
          <div className="stat-value">{stats.open_purchase_orders_count}</div>
          <div className="stat-meta">Value: ₹{stats.open_purchase_orders_value?.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">30-Day Transactions</span>
            <div className="stat-icon"><Activity size={18} /></div>
          </div>
          <div className="stat-value">{stats.transactions_30d_count?.toLocaleString()}</div>
          <div className="stat-meta">Total Inbound & Outbound</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Predicted 30d Demand</span>
            <div className="stat-icon" style={{ color: '#38bdf8' }}><TrendingUp size={18} /></div>
          </div>
          <div className="stat-value">{Math.round(stats.predicted_30d_demand_total || 0).toLocaleString()}</div>
          <div className="stat-meta">Model 1 (Random Forest) Forecast</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">High Stockout Risk</span>
            <div className="stat-icon" style={{ color: 'var(--danger)' }}><ShieldAlert size={18} /></div>
          </div>
          <div className="stat-value" style={{ color: stats.high_stockout_risk_count > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
            {stats.high_stockout_risk_count}
          </div>
          <div className="stat-meta">Model 3 (Classifier) Flagged</div>
        </div>
      </div>

      {/* 3. 7 DASHBOARD CHARTS (Section 27) */}
      <div className="charts-grid">
        {/* Chart 1: Daily Transaction Volume */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Chart 1: Daily Transaction Volume</div>
              <div className="card-subtitle">Volume of transaction events over the past 14 days</div>
            </div>
          </div>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.daily_volume || []}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Area type="monotone" dataKey="transactions" stroke="#4f46e5" fill="url(#volGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Sales/Demand Trend by Transaction Type */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Chart 2: Activity Breakdown by Type</div>
              <div className="card-subtitle">Cumulative units by ISSUE, RECEIVE, TRANSFER, ADJUST, RETURN</div>
            </div>
          </div>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.sales_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="type" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="quantity" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Inventory by Category */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Chart 3: Inventory by Category</div>
              <div className="card-subtitle">Total stocked units across the 8 categories</div>
            </div>
          </div>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.category_distribution || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis dataKey="category" type="category" stroke="#64748b" fontSize={11} width={100} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="units" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Inventory by Location */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Chart 4: Stock Balance by Facility</div>
              <div className="card-subtitle">Distribution across 8 warehouse locations</div>
            </div>
          </div>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.location_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="location" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="units" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Predicted vs Actual Demand */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Chart 5: Predicted vs Actual Demand</div>
              <div className="card-subtitle">AI Demand Model (RF Regressor) vs Actual Sales for key items</div>
            </div>
          </div>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.predicted_vs_actual || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="product" stroke="#64748b" fontSize={10} interval={0} angle={-15} textAnchor="end" height={40} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Legend />
                <Bar dataKey="actual_sales" name="Actual Sold" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="predicted" name="Predicted Demand" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Stockout Risk Distribution */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Chart 6: Stockout Risk Distribution</div>
              <div className="card-subtitle">Model 3 Classifier (LOW, MEDIUM, HIGH) risk segments</div>
            </div>
          </div>
          <div style={{ height: '260px', display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.risk_distribution || []}
                  dataKey="count"
                  nameKey="risk"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ risk, count }) => `${risk}: ${count}`}
                >
                  {(charts.risk_distribution || []).map((entry, index) => {
                    const color = entry.risk === 'HIGH' ? '#dc2626' : entry.risk === 'MEDIUM' ? '#d97706' : '#059669';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Pie>
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 7: Reorder Recommendations */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Chart 7: Decision Agent Policy Breakdown</div>
              <div className="card-subtitle">Decisions (REORDER NOW, REORDER SOON, MONITOR, NO ACTION)</div>
            </div>
          </div>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.reorder_breakdown || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="recommendation" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. REAL-TIME CUSTOMER TRANSACTIONS & SENTINEL ALERTS DUAL CARD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px' }}>
        {/* Real-Time Customer Transactions (Section 26) */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Activity size={18} color="var(--primary)" />
              <span>Real-Time Customer Transactions</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="sim-pulse-dot" style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
                <span>LIVE ●</span>
              </span>
            </div>
          </div>

          {/* Quick Cards Feed for Recent Customer Purchases */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {stats.recent_transactions?.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                No recent customer purchases recorded. Start simulation to observe live transactions.
              </div>
            ) : (
              stats.recent_transactions?.slice(0, 3).map((t) => {
                const custId = t.reason?.match(/Customer Purchase \(([^)]+)\)/)?.[1]
                  || (t.reference_number?.startsWith('ORD-CUST-') ? t.reference_number.replace('ORD-', '') : null)
                  || (t.transaction_id?.startsWith('SIM-') ? `CUST-${t.transaction_id.replace('SIM-', '').slice(-4)}` : (t.reference_number || 'Customer'));

                return (
                  <div
                    key={`feed-${t.id}`}
                    onClick={() => onSelectItem && onSelectItem(t.product_id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#f8fafc',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: 'var(--primary)',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        {custId}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {t.product_name} <span style={{ color: 'var(--primary)', fontWeight: 800 }}>× {t.quantity}</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Tx: <span style={{ fontFamily: 'var(--font-mono)' }}>{t.transaction_id}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Stock: <span style={{ color: 'var(--text-muted)' }}>{t.previous_stock ?? '—'}</span> → <strong style={{ color: (t.new_stock ?? 0) <= 20 ? 'var(--danger)' : 'var(--success)' }}>{t.new_stock ?? '—'}</strong>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {t.timestamp?.slice(11, 19)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Detailed Transactions Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tx ID</th>
                  <th>Customer / Ref</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Stock Change</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_transactions?.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No recent activity.</td></tr>
                ) : (
                  stats.recent_transactions?.slice(0, 6).map((t) => {
                    const custId = t.reason?.match(/Customer Purchase \(([^)]+)\)/)?.[1]
                      || (t.reference_number?.startsWith('ORD-CUST-') ? t.reference_number.replace('ORD-', '') : (t.reference_number || '—'));

                    return (
                      <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => onSelectItem(t.product_id)}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{t.transaction_id}</td>
                        <td style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{custId}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.product_name}</td>
                        <td>
                          <span className={`badge ${t.transaction_type === 'SALE' || t.transaction_type === 'ISSUE' ? 'badge-danger' : 'badge-success'}`}>
                            {t.transaction_type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{t.quantity}</td>
                        <td style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                          {t.previous_stock != null && t.new_stock != null ? `${t.previous_stock} → ${t.new_stock}` : '—'}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{t.timestamp?.slice(11, 19)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Alerts Stream */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <AlertTriangle size={18} color="var(--warning)" />
              <span>Active Sentinel Alerts</span>
            </div>
            <span className="badge badge-warning">{stats.recent_alerts?.length || 0} Alerts</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
            {stats.recent_alerts?.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active critical alerts.
              </div>
            ) : (
              stats.recent_alerts?.map((a) => (
                <div
                  key={a.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  <span className={`badge badge-${a.severity?.toLowerCase()}`}>
                    {a.severity}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {a.message}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {a.timestamp}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: AI REORDER RECOMMENDATION REVIEW & APPROVAL */}
      {reviewItem && (
        <div className="modal-overlay" onClick={() => setReviewItem(null)}>
          <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="brand-icon-box" style={{ width: '36px', height: '36px', background: 'rgba(79, 70, 229, 0.12)', color: 'var(--primary)' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    AI Reorder Recommendation Review
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Recommendation #{reviewItem.id} • {reviewItem.product_name}
                  </p>
                </div>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setReviewItem(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Alert status callout */}
              <div
                style={{
                  background: reviewItem.urgency === 'CRITICAL' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  border: `1px solid ${reviewItem.urgency === 'CRITICAL' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <AlertTriangle size={22} color={reviewItem.urgency === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)'} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    {reviewItem.urgency === 'CRITICAL' ? '🔴 Critical Stockout Alert' : '⚠️ Low Stock Warning'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Current physical stock (<strong>{reviewItem.current_stock}</strong>) is at/below the reorder threshold (<strong>{reviewItem.reorder_point}</strong>).
                  </div>
                </div>
              </div>

              {/* Data Breakdown Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Current Physical Stock</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--danger)', marginTop: '2px' }}>
                    {reviewItem.current_stock} units
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Reorder Threshold</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {reviewItem.reorder_point} units
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>30-Day Demand Forecast</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
                    {reviewItem.predicted_demand} units
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Target Supplier</span>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {reviewItem.supplier_name}
                  </div>
                </div>
              </div>

              {/* Editable Reorder Quantity & Dynamic Cost */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                      Reorder Quantity to Approve:
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      AI Recommended: {reviewItem.recommended_quantity} units
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={orderQty}
                    onChange={(e) => setOrderQty(e.target.value)}
                    className="form-control"
                    style={{ width: '120px', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Estimated Purchase Order Cost:
                  </span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>
                    ₹{(
                      Number(orderQty || 0) *
                      (reviewItem.estimated_cost && reviewItem.recommended_quantity
                        ? reviewItem.estimated_cost / reviewItem.recommended_quantity
                        : 0)
                    ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Policy Rule Reminder */}
              <div
                style={{
                  background: '#f1f5f9',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  fontSize: '0.76rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}
              >
                <Info size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Strict Business Rule:</strong> Approving creates a <strong>DRAFT Purchase Order</strong>. Stock does NOT increase immediately. Current physical stock remains at <strong>{reviewItem.current_stock}</strong> until the delivery is received.
                </span>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setReviewItem(null)}>
                Cancel
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-danger"
                  disabled={approvingId === reviewItem.id}
                  onClick={handleModalReject}
                >
                  <X size={15} />
                  <span>Reject</span>
                </button>
                <button
                  className="btn btn-success"
                  disabled={approvingId === reviewItem.id}
                  onClick={handleModalApprove}
                >
                  {approvingId === reviewItem.id ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Approving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Approve & Create Draft PO</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DRAFT PURCHASE ORDER CREATION SUCCESS CONFIRMATION */}
      {approvalSuccess && (
        <div className="modal-overlay" onClick={() => setApprovalSuccess(null)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Reorder Approved!
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    Draft Purchase Order created successfully.
                  </p>
                </div>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setApprovalSuccess(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
              <div style={{ background: '#f8fafc', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Purchase Order Number:</span>
                  <span className="badge badge-primary" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', padding: '4px 10px' }}>
                    {approvalSuccess.poNumber}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Product:</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {approvalSuccess.productName}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Quantity Ordered:</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary)' }}>
                    +{approvalSuccess.quantity} units
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Supplier:</span>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    {approvalSuccess.supplierName}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Order Value:</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>
                    ₹{approvalSuccess.cost?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Reassurance Callout */}
              <div
                style={{
                  background: 'rgba(79, 70, 229, 0.05)',
                  border: '1px solid rgba(79, 70, 229, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <Info size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Inventory Unchanged:</strong> Physical stock remains at <strong>{approvalSuccess.currentStock} units</strong>. To complete fulfillment and increase stock, open <strong>Purchase Orders</strong> and receive the shipment when it arrives.
                </span>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setApprovalSuccess(null)}>
                Done
              </button>
              {onNavigate && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setApprovalSuccess(null);
                    onNavigate('pos');
                  }}
                >
                  <FileText size={15} />
                  <span>View in Purchase Orders</span>
                  <ArrowUpRight size={14} />
                </button>
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
      />
    </div>
  );
}
