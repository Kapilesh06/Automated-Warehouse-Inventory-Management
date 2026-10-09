/**
 * src/services/aiService.js
 * Frontend Service for Google Gemini GenAI Endpoints
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
    console.error(`AI API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const aiService = {
  // Check Gemini API status (configured or not, active model)
  getStatus: () => request('/ai/status'),

  // Feature 1: Explain Reorder Recommendation
  explainReorder: (params) => request('/ai/explain-reorder', {
    method: 'POST',
    body: JSON.stringify(params) // { product_id: ... } or { recommendation_id: ... }
  }),

  // Feature 2: Inventory AI Assistant (Chat)
  askChat: (question) => request('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ question })
  }),

  // Feature 3: Daily Inventory Summary
  getDailySummary: () => request('/ai/daily-summary', {
    method: 'POST'
  }),

  // Feature 4: Specialized AI Reports
  generateReport: (reportType = 'daily_inventory') => request('/ai/report', {
    method: 'POST',
    body: JSON.stringify({ report_type: reportType })
  })
};
