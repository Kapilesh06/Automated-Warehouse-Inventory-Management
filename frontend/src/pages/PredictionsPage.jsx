/**
 * src/pages/PredictionsPage.jsx
 * AI Predictions & Machine Learning Model Telemetry inspection page.
 */

import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, Sparkles, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

export default function PredictionsPage({ products = [], onSelectItem }) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const res = await api.getPredictions({ limit: 100 });
      setPredictions(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner with Model Architectures & Performance Metrics */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Machine Learning Prediction Engine & Metrics
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Inference results rendered across 5 independently trained machine learning models.
            </p>
          </div>

          <button className="btn btn-secondary" onClick={fetchPredictions} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Predictions</span>
          </button>
        </div>

        {/* 5 ML Models Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>Model 1: Random Forest</span>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem', marginTop: '4px' }}>Demand Prediction</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target: 30-Day Forward Demand</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, marginTop: '4px' }}>R²: 0.22 • MAE: 104.4</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>Model 2: Gradient Boosting</span>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem', marginTop: '4px' }}>Short-Term Velocity</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target: 7-Day Forward Demand</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, marginTop: '4px' }}>R²: 0.51 • MAE: 27.5</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span className="badge badge-warning" style={{ fontSize: '0.62rem' }}>Model 3: RF Classifier</span>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem', marginTop: '4px' }}>Stockout Risk</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target: LOW, MEDIUM, HIGH</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, marginTop: '4px' }}>Accuracy: 98.3% • F1: 0.98</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>Model 4: Random Forest</span>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem', marginTop: '4px' }}>Reorder Quantity</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target: Suggested Units</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, marginTop: '4px' }}>MAE: 2.57 Units</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>Model 5: Decision Tree</span>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem', marginTop: '4px' }}>Inventory Status</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target: OVERSTOCK/NORMAL/LOW/CRITICAL</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, marginTop: '4px' }}>Accuracy: 100% • Depth: 6</div>
          </div>
        </div>
      </div>

      {/* Predictions Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product / SKU</th>
              <th>Predicted 30d Demand</th>
              <th>Short-Term 7d Demand</th>
              <th>Stockout Risk</th>
              <th>Inventory Status</th>
              <th>Reorder Quantity</th>
              <th>Reorder Point</th>
              <th>Decision Agent Action</th>
              <th>Computed At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading model inferences...</td></tr>
            ) : predictions.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>No predictions recorded yet.</td></tr>
            ) : (
              predictions.map((p) => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => onSelectItem && onSelectItem(p.product_id)}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div>{p.product_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.sku}</div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.predicted_demand} units</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.short_term_demand} units</td>
                  <td>
                    <span
                      className={`badge ${
                        p.stockout_risk === 'HIGH' ? 'badge-danger' : p.stockout_risk === 'MEDIUM' ? 'badge-warning' : 'badge-success'
                      }`}
                    >
                      {p.stockout_risk}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-secondary">{p.inventory_status}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: 'var(--primary-light)' }}>
                      +{p.recommended_reorder_quantity}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{p.reorder_point}</td>
                  <td>
                    <span
                      className={`badge ${
                        p.recommendation === 'REORDER NOW'
                          ? 'badge-danger'
                          : p.recommendation === 'REORDER SOON'
                          ? 'badge-warning'
                          : p.recommendation === 'MONITOR'
                          ? 'badge-primary'
                          : 'badge-secondary'
                      }`}
                    >
                      {p.recommendation}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {p.created_at ? p.created_at.slice(11, 19) : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
