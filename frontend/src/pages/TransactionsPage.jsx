/**
 * src/pages/TransactionsPage.jsx
 * Complete transaction history ledger with filtering by Product, Type, and Location.
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Filter, Download, RefreshCw, Calendar } from 'lucide-react';
import { api } from '../services/api';

export default function TransactionsPage({ products = [], locations = [], onSelectItem }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.getTransactions({
        product_id: selectedProduct ? parseInt(selectedProduct) : undefined,
        transaction_type: selectedType || undefined,
        location_id: selectedLocation ? parseInt(selectedLocation) : undefined,
        limit: 150
      });
      setTransactions(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedProduct, selectedType, selectedLocation]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filters Card */}
      <div className="card" style={{ padding: '18px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'center' }}>
          <div>
            <label className="form-label">Filter by Product</label>
            <select
              className="form-select"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="">All Products ({products.length})</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Transaction Type</label>
            <select
              className="form-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">All Movement Types</option>
              <option value="SALE">SALE (Customer Purchases)</option>
              <option value="ISSUE">ISSUE (Outbound / Sales)</option>
              <option value="RECEIVE">RECEIVE (Inbound / Supplier PO)</option>
              <option value="TRANSFER">TRANSFER (Inter-facility)</option>
              <option value="ADJUST">ADJUST (Cycle Count)</option>
              <option value="RETURN">RETURN (RMA / Restock)</option>
            </select>
          </div>

          <div>
            <label className="form-label">Facility / Location</label>
            <select
              className="form-select"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="">All Locations ({locations.length})</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.code} — {l.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={fetchTransactions} disabled={loading} style={{ width: '100%' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tx ID</th>
              <th>Date & Time</th>
              <th>Product / SKU</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Source Facility</th>
              <th>Destination Facility</th>
              <th>Reason</th>
              <th>Reference #</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading transaction records...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>No transactions matched criteria.</td></tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} style={{ cursor: 'pointer' }} onClick={() => onSelectItem && onSelectItem(tx.product_id)}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--primary)' }}>
                    {tx.transaction_id}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {tx.timestamp ? tx.timestamp.replace('T', ' ').slice(0, 19) : ''}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div>{tx.product_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tx.sku}</div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        tx.transaction_type === 'SALE' || tx.transaction_type === 'ISSUE'
                          ? 'badge-danger'
                          : tx.transaction_type === 'RECEIVE'
                          ? 'badge-success'
                          : tx.transaction_type === 'TRANSFER'
                          ? 'badge-primary'
                          : 'badge-warning'
                      }`}
                    >
                      {tx.transaction_type}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        color: tx.transaction_type === 'ISSUE' ? 'var(--danger)' : tx.transaction_type === 'RECEIVE' ? 'var(--success)' : 'var(--text-primary)'
                      }}
                    >
                      {tx.transaction_type === 'ISSUE' ? `-${tx.quantity}` : `+${tx.quantity}`}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{tx.source_location_name || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{tx.destination_location_name || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: '200px' }}>{tx.reason}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{tx.reference_number || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
