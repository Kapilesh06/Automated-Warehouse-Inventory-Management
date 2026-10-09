/**
 * src/pages/CountsPage.jsx
 * Physical Inventory Cycle Count Campaigns & Reconciliations page.
 */

import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Plus, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function CountsPage({ onOpenNewCount }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await api.getStockCounts();
      setCampaigns(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card" style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Inventory Cycle Counts & Discrepancy Audits
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Reconciles recorded database stock against physical shelf counts and logs adjustment transactions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchCampaigns} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={onOpenNewCount}>
            <Plus size={16} />
            <span>New Count Campaign</span>
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Campaign Name</th>
              <th>Facility Location</th>
              <th>Status</th>
              <th>Audited Date</th>
              <th>Items Audited</th>
              <th>Total Variance</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading count campaigns...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>No cycle count campaigns logged yet.</td></tr>
            ) : (
              campaigns.map((c) => {
                const isExpanded = expandedId === c.id;
                const totalVariance = c.items?.reduce((acc, it) => acc + it.variance, 0) || 0;

                return (
                  <React.Fragment key={c.id}>
                    <tr>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.campaign_name}</td>
                      <td>{c.location_name}</td>
                      <td>
                        <span className="badge badge-success">{c.status}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {c.completed_at ? c.completed_at.slice(0, 16).replace('T', ' ') : ''}
                      </td>
                      <td>{c.items?.length || 0} Products</td>
                      <td>
                        <span style={{ fontWeight: 700, color: totalVariance < 0 ? 'var(--danger)' : totalVariance > 0 ? '#34d399' : 'var(--text-muted)' }}>
                          {totalVariance > 0 ? `+${totalVariance}` : totalVariance}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        >
                          {isExpanded ? 'Hide' : 'Inspect'}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={7} style={{ padding: '16px 24px' }}>
                          <div className="table-container" style={{ background: '#ffffff', border: '1px solid var(--border-subtle)' }}>
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>SKU</th>
                                  <th>Product</th>
                                  <th>Expected</th>
                                  <th>Actual Counted</th>
                                  <th>Variance</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.items?.map((it) => (
                                  <tr key={it.id}>
                                    <td style={{ fontFamily: 'var(--font-mono)' }}>{it.sku}</td>
                                    <td style={{ color: 'var(--text-primary)' }}>{it.product_name}</td>
                                    <td>{it.expected_quantity}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{it.actual_quantity}</td>
                                    <td style={{ fontWeight: 700, color: it.variance < 0 ? 'var(--danger)' : it.variance > 0 ? '#34d399' : 'var(--text-muted)' }}>
                                      {it.variance > 0 ? `+${it.variance}` : it.variance}
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
