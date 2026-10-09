/**
 * src/services/api.js
 * Centralized API client communicating with FastAPI backend.
 */

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP Error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // System & Dashboard
  getRoot: () => request('/'),
  getDashboard: () => request('/dashboard'),

  // Products
  getProducts: (params = {}) => {
    const q = new URLSearchParams();
    if (params.category_id) q.set('category_id', params.category_id);
    if (params.supplier_id) q.set('supplier_id', params.supplier_id);
    if (params.stock_status) q.set('stock_status', params.stock_status);
    if (params.search) q.set('search', params.search);
    const qs = q.toString();
    return request(`/products${qs ? `?${qs}` : ''}`);
  },
  getProductDetail: (id) => request(`/products/${id}`),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),

  // Inventory
  getInventory: (location_id) => request(`/inventory${location_id ? `?location_id=${location_id}` : ''}`),
  getInventoryForProduct: (productId) => request(`/inventory/${productId}`),

  // Transactions
  getTransactions: (params = {}) => {
    const q = new URLSearchParams();
    if (params.product_id) q.set('product_id', params.product_id);
    if (params.transaction_type) q.set('transaction_type', params.transaction_type);
    if (params.location_id) q.set('location_id', params.location_id);
    if (params.limit) q.set('limit', params.limit);
    const qs = q.toString();
    return request(`/transactions${qs ? `?${qs}` : ''}`);
  },
  createTransaction: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  stockReceive: (data) => request('/stock/receive', { method: 'POST', body: JSON.stringify(data) }),
  stockIssue: (data) => request('/stock/issue', { method: 'POST', body: JSON.stringify(data) }),
  stockAdjust: (data) => request('/stock/adjust', { method: 'POST', body: JSON.stringify(data) }),
  stockTransfer: (data) => request('/stock/transfer', { method: 'POST', body: JSON.stringify(data) }),
  stockReturn: (data) => request('/stock/return', { method: 'POST', body: JSON.stringify(data) }),

  // Purchase Orders
  getPurchaseOrders: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.supplier_id) q.set('supplier_id', params.supplier_id);
    const qs = q.toString();
    return request(`/purchase-orders${qs ? `?${qs}` : ''}`);
  },
  getPurchaseOrder: (id) => request(`/purchase-orders/${id}`),
  createPurchaseOrder: (data) => request('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  receivePOItem: (poId, data) => request(`/purchase-orders/${poId}/receive`, { method: 'POST', body: JSON.stringify(data) }),
  receiveStock: (poId, data) => request(`/purchase-orders/${poId}/receive`, { method: 'POST', body: JSON.stringify(data) }),

  // Reorder Queue (Section 12 & 13)
  getReorderQueue: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.urgency) q.set('urgency', params.urgency);
    const qs = q.toString();
    return request(`/reorder-queue${qs ? `?${qs}` : ''}`);
  },
  getReorderQueueItem: (id) => request(`/reorder-queue/${id}`),
  approveReorder: (id, data = null) => request(`/reorder-queue/${id}/approve`, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  }),
  rejectReorder: (id) => request(`/reorder-queue/${id}/reject`, { method: 'POST' }),
  getAIReorderPlan: (data = {}) => request('/ai/reorder-plan', { method: 'POST', body: JSON.stringify(data) }),
  getProductReorderPlan: (productId) => request(`/ai/reorder-plan/${productId}`, { method: 'POST' }),
  createDraftPOsFromPlan: (data = {}) => request('/ai/reorder-plan/create-pos', { method: 'POST', body: JSON.stringify(data) }),

  // Simulation Controls
  getSimulationStatus: () => request('/simulation/status'),
  startSimulation: (startIndex) => {
    const qs = startIndex !== undefined ? `?start_index=${startIndex}` : '';
    return request(`/simulation/start${qs}`, { method: 'POST' });
  },
  pauseSimulation: () => request('/simulation/pause', { method: 'POST' }),
  resumeSimulation: () => request('/simulation/resume', { method: 'POST' }),
  stopSimulation: () => request('/simulation/stop', { method: 'POST' }),
  setSimulationSpeed: (delaySeconds) => request('/simulation/speed', { method: 'POST', body: JSON.stringify({ delay_seconds: delaySeconds }) }),

  // Multi-Agent Status & Predictions
  getAgentsStatus: () => request('/agents/status'),
  getPredictions: (params = {}) => {
    const q = new URLSearchParams();
    if (params.product_id) q.set('product_id', params.product_id);
    if (params.limit) q.set('limit', params.limit);
    const qs = q.toString();
    return request(`/predictions${qs ? `?${qs}` : ''}`);
  },
  getAlerts: (params = {}) => {
    const q = new URLSearchParams();
    if (params.severity) q.set('severity', params.severity);
    if (params.limit) q.set('limit', params.limit);
    const qs = q.toString();
    return request(`/alerts${qs ? `?${qs}` : ''}`);
  },
  markAlertRead: (id) => request(`/alerts/${id}/read`, { method: 'POST' }),

  // Categories, Suppliers, Locations, Stock Counts
  getCategories: () => request('/categories'),
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  getSuppliers: () => request('/suppliers'),
  getSupplierDetail: (id) => request(`/suppliers/${id}`),
  createSupplier: (data) => request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  getLocations: () => request('/locations'),
  createLocation: (data) => request('/locations', { method: 'POST', body: JSON.stringify(data) }),
  getStockCounts: () => request('/stock-counts'),
  createStockCount: (data) => request('/stock-counts', { method: 'POST', body: JSON.stringify(data) }),

  // Generative AI (Google Gemini)
  getAIStatus: () => request('/ai/status'),
  explainReorder: (params) => request('/ai/explain-reorder', { method: 'POST', body: JSON.stringify(params) }),
  askAIChat: (question) => request('/ai/chat', { method: 'POST', body: JSON.stringify({ question }) }),
  getDailySummary: () => request('/ai/daily-summary', { method: 'POST' }),
  generateAIReport: (reportType) => request('/ai/report', { method: 'POST', body: JSON.stringify({ report_type: reportType }) })
};
