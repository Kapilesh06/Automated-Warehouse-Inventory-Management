/**
 * src/pages/ItemsPage.jsx
 * Filterable, searchable product inventory catalog fulfilling Section 29 specifications.
 */

import React, { useState, useMemo } from 'react';
import { Search, Filter, Eye, ArrowUpRight, Boxes, Sparkles, RefreshCw } from 'lucide-react';

export default function ItemsPage({
  products = [],
  categories = [],
  suppliers = [],
  onSelectItem,
  onOpenNewProduct
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.toLowerCase().includes(search.toLowerCase());

      const matchCat = !selectedCategory || p.category_id === parseInt(selectedCategory);
      const matchSup = !selectedSupplier || p.supplier_id === parseInt(selectedSupplier);
      const matchStat = !selectedStatus || p.stock_status === selectedStatus;

      return matchSearch && matchCat && matchSup && matchStat;
    });
  }, [products, search, selectedCategory, selectedSupplier, selectedStatus]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Search and Filters Bar */}
      <div className="card" style={{ padding: '18px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'center' }}>
          {/* Search text */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search by SKU, barcode, or product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category filter */}
          <div>
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Supplier filter */}
          <div>
            <select
              className="form-select"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="">All Suppliers ({suppliers.length})</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Stock status filter */}
          <div>
            <select
              className="form-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Stock Statuses</option>
              <option value="IN STOCK">IN STOCK (Healthy)</option>
              <option value="LOW STOCK">LOW STOCK (&le; Reorder Point)</option>
              <option value="OUT OF STOCK">OUT OF STOCK (Critical)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>Showing <strong>{filteredProducts.length}</strong> of {products.length} catalog items</span>
          {(search || selectedCategory || selectedSupplier || selectedStatus) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch('');
                setSelectedCategory('');
                setSelectedSupplier('');
                setSelectedStatus('');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Catalog Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU / Barcode</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Supplier</th>
              <th>Stock</th>
              <th>Unit Cost</th>
              <th>Selling Price</th>
              <th>Margin</th>
              <th>Reorder Pt</th>
              <th>AI Risk</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                  No products found matching active filter criteria.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const risk = p.latest_prediction?.stockout_risk || 'LOW';
                const decision = p.latest_prediction?.recommendation || 'MONITOR';

                return (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => onSelectItem(p.id)}>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.sku}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.barcode}</div>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: '240px' }}>
                      {p.name}
                    </td>
                    <td>
                      <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>
                        {p.category_name}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.supplier_name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: p.current_stock === 0 ? 'var(--danger)' : p.current_stock <= p.reorder_point ? 'var(--warning)' : 'var(--success)'
                          }}
                        >
                          {p.current_stock}
                        </span>
                        <span
                          className={`badge ${
                            p.stock_status === 'OUT OF STOCK'
                              ? 'badge-danger'
                              : p.stock_status === 'LOW STOCK'
                              ? 'badge-warning'
                              : 'badge-success'
                          }`}
                          style={{ fontSize: '0.62rem', padding: '1px 6px' }}
                        >
                          {p.stock_status}
                        </span>
                      </div>
                    </td>
                    <td>₹{p.unit_cost.toLocaleString()}</td>
                    <td>₹{p.selling_price.toLocaleString()}</td>
                    <td style={{ color: '#34d399', fontWeight: 600 }}>{p.margin}%</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{p.reorder_point}</td>
                    <td>
                      <span
                        className={`badge ${
                          risk === 'HIGH' ? 'badge-danger' : risk === 'MEDIUM' ? 'badge-warning' : 'badge-success'
                        }`}
                      >
                        {risk}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectItem(p.id);
                        }}
                      >
                        <Eye size={12} />
                        <span>Inspect</span>
                      </button>
                    </td>
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
