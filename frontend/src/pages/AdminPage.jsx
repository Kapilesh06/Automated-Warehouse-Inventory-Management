/**
 * src/pages/AdminPage.jsx
 * Administrative management interface for Products, Categories, Locations, and Suppliers.
 * Fulfills Section 37 specifications.
 */

import React, { useState } from 'react';
import { Settings, Plus, Boxes, Building2, MapPin, Tag, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function AdminPage({ categories = [], suppliers = [], locations = [], onCatalogChanged }) {
  const [activeTab, setActiveTab] = useState('product'); // product, category, location, supplier
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  // Product Form State
  const [productForm, setProductForm] = useState({
    sku: 'SKU-09-001',
    barcode: '89009001123',
    name: '',
    category_id: categories[0]?.id || 1,
    supplier_id: suppliers[0]?.id || 1,
    unit: 'Units',
    unit_cost: 1500,
    selling_price: 2200,
    reorder_point: 25,
    reorder_quantity: 60,
    lead_time_days: 5,
    safety_stock: 15
  });

  // Category Form State
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  // Location Form State
  const [locForm, setLocForm] = useState({ name: '', code: 'WH-NEW', type: 'PRIMARY', address: '' });

  // Supplier Form State
  const [supForm, setSupForm] = useState({
    supplier_code: 'SUP-NEW',
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    lead_time_days: 7,
    minimum_order_amount: 25000,
    reliability_rating: 0.95
  });

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setLoading(true);
    try {
      await api.createProduct({
        ...productForm,
        category_id: parseInt(productForm.category_id),
        supplier_id: parseInt(productForm.supplier_id),
        unit_cost: parseFloat(productForm.unit_cost),
        selling_price: parseFloat(productForm.selling_price),
        reorder_point: parseInt(productForm.reorder_point),
        reorder_quantity: parseInt(productForm.reorder_quantity),
        lead_time_days: parseInt(productForm.lead_time_days),
        safety_stock: parseInt(productForm.safety_stock)
      });
      setSuccessMsg(`Product "${productForm.name}" created successfully and initialized across all facilities.`);
      setProductForm({ ...productForm, name: '', sku: `SKU-09-${Date.now() % 1000}` });
      if (onCatalogChanged) onCatalogChanged();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setLoading(true);
    try {
      await api.createCategory(catForm);
      setSuccessMsg(`Category "${catForm.name}" added successfully.`);
      setCatForm({ name: '', description: '' });
      if (onCatalogChanged) onCatalogChanged();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setLoading(true);
    try {
      await api.createLocation(locForm);
      setSuccessMsg(`Location "${locForm.name}" (${locForm.code}) created successfully.`);
      setLocForm({ name: '', code: `WH-${Date.now() % 1000}`, type: 'PRIMARY', address: '' });
      if (onCatalogChanged) onCatalogChanged();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setLoading(true);
    try {
      await api.createSupplier({
        ...supForm,
        lead_time_days: parseInt(supForm.lead_time_days),
        minimum_order_amount: parseFloat(supForm.minimum_order_amount),
        reliability_rating: parseFloat(supForm.reliability_rating)
      });
      setSuccessMsg(`Supplier "${supForm.name}" created successfully.`);
      setSupForm({ ...supForm, name: '', supplier_code: `SUP-${Date.now() % 1000}` });
      if (onCatalogChanged) onCatalogChanged();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card" style={{ padding: '18px 24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Warehouse Administration & Master Catalog
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Configure Products, Product Categories, Warehousing Facilities, and Vendor Accounts.
        </p>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          <button
            className={`btn ${activeTab === 'product' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => { setActiveTab('product'); setSuccessMsg(null); setErrorMsg(null); }}
          >
            <Boxes size={14} />
            <span>Add Product</span>
          </button>
          <button
            className={`btn ${activeTab === 'category' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => { setActiveTab('category'); setSuccessMsg(null); setErrorMsg(null); }}
          >
            <Tag size={14} />
            <span>Add Category</span>
          </button>
          <button
            className={`btn ${activeTab === 'location' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => { setActiveTab('location'); setSuccessMsg(null); setErrorMsg(null); }}
          >
            <MapPin size={14} />
            <span>Add Facility</span>
          </button>
          <button
            className={`btn ${activeTab === 'supplier' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => { setActiveTab('supplier'); setSuccessMsg(null); setErrorMsg(null); }}
          >
            <Building2 size={14} />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 18px', color: '#34d399', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 18px', color: '#f87171', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab 1: Product Form */}
      {activeTab === 'product' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Add New Product to Warehouse Catalog</div>
          </div>
          <form onSubmit={handleProductSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Product Name</label>
              <input
                type="text"
                className="form-input"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="e.g. Ergonomic Keyboard Pro"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input
                type="text"
                className="form-input"
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Barcode</label>
              <input
                type="text"
                className="form-input"
                value={productForm.barcode}
                onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={productForm.category_id}
                onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Supplier</label>
              <select
                className="form-select"
                value={productForm.supplier_id}
                onChange={(e) => setProductForm({ ...productForm, supplier_id: e.target.value })}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit of Measure</label>
              <input
                type="text"
                className="form-input"
                value={productForm.unit}
                onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Unit Cost (₹)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={productForm.unit_cost}
                onChange={(e) => setProductForm({ ...productForm, unit_cost: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Selling Price (₹)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={productForm.selling_price}
                onChange={(e) => setProductForm({ ...productForm, selling_price: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Reorder Point</label>
              <input
                type="number"
                className="form-input"
                value={productForm.reorder_point}
                onChange={(e) => setProductForm({ ...productForm, reorder_point: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Reorder Quantity</label>
              <input
                type="number"
                className="form-input"
                value={productForm.reorder_quantity}
                onChange={(e) => setProductForm({ ...productForm, reorder_quantity: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Lead Time (Days)</label>
              <input
                type="number"
                className="form-input"
                value={productForm.lead_time_days}
                onChange={(e) => setProductForm({ ...productForm, lead_time_days: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Safety Stock</label>
              <input
                type="number"
                className="form-input"
                value={productForm.safety_stock}
                onChange={(e) => setProductForm({ ...productForm, safety_stock: e.target.value })}
                required
              />
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '12px' }}>
                <Plus size={16} />
                <span>{loading ? 'Creating...' : 'Create & Register Product'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Category Form */}
      {activeTab === 'category' && (
        <div className="card" style={{ maxWidth: '580px' }}>
          <div className="card-header">
            <div className="card-title">Add New Category</div>
          </div>
          <form onSubmit={handleCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Category Name</label>
              <input
                type="text"
                className="form-input"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                placeholder="e.g. Robotics Parts"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Plus size={16} />
              <span>Save Category</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Location Form */}
      {activeTab === 'location' && (
        <div className="card" style={{ maxWidth: '580px' }}>
          <div className="card-header">
            <div className="card-title">Add Warehouse Facility</div>
          </div>
          <form onSubmit={handleLocationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Facility Name</label>
              <input
                type="text"
                className="form-input"
                value={locForm.name}
                onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                placeholder="e.g. South Logistics Depot"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Facility Code</label>
              <input
                type="text"
                className="form-input"
                value={locForm.code}
                onChange={(e) => setLocForm({ ...locForm, code: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="form-select"
                value={locForm.type}
                onChange={(e) => setLocForm({ ...locForm, type: e.target.value })}
              >
                <option value="PRIMARY">PRIMARY</option>
                <option value="DISTRIBUTION">DISTRIBUTION</option>
                <option value="FULFILLMENT">FULFILLMENT</option>
                <option value="DEPOT">DEPOT</option>
                <option value="OVERFLOW">OVERFLOW</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Physical Address</label>
              <input
                type="text"
                className="form-input"
                value={locForm.address}
                onChange={(e) => setLocForm({ ...locForm, address: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Plus size={16} />
              <span>Save Facility</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Supplier Form */}
      {activeTab === 'supplier' && (
        <div className="card" style={{ maxWidth: '680px' }}>
          <div className="card-header">
            <div className="card-title">Add Certified Supplier</div>
          </div>
          <form onSubmit={handleSupplierSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Supplier Name</label>
              <input
                type="text"
                className="form-input"
                value={supForm.name}
                onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Supplier Code</label>
              <input
                type="text"
                className="form-input"
                value={supForm.supplier_code}
                onChange={(e) => setSupForm({ ...supForm, supplier_code: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Person</label>
              <input
                type="text"
                className="form-input"
                value={supForm.contact_person}
                onChange={(e) => setSupForm({ ...supForm, contact_person: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={supForm.email}
                onChange={(e) => setSupForm({ ...supForm, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="text"
                className="form-input"
                value={supForm.phone}
                onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Standard Lead Time (Days)</label>
              <input
                type="number"
                className="form-input"
                value={supForm.lead_time_days}
                onChange={(e) => setSupForm({ ...supForm, lead_time_days: e.target.value })}
                required
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Address</label>
              <input
                type="text"
                className="form-input"
                value={supForm.address}
                onChange={(e) => setSupForm({ ...supForm, address: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                <Plus size={16} />
                <span>Save Supplier</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
