/**
 * src/App.jsx
 * Master Application Shell connecting the Multi-Agent Backend, Simulation Replay Engine,
 * Real-Time WebSocket stream, and responsive frontend views.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import SimulationBar from './components/SimulationBar';
import { ToastContainer } from './components/ToastNotification';

import Dashboard from './pages/Dashboard';
import ItemsPage from './pages/ItemsPage';
import TransactionsPage from './pages/TransactionsPage';
import StockOpsPage from './pages/StockOpsPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import ReorderQueue from './pages/ReorderQueue';
import CountsPage from './pages/CountsPage';
import SuppliersPage from './pages/SuppliersPage';
import PredictionsPage from './pages/PredictionsPage';
import AgentMonitorPage from './pages/AgentMonitorPage';
import SimulationPage from './pages/SimulationPage';
import AdminPage from './pages/AdminPage';
import InventoryAI from './pages/InventoryAI';

import AIReorderPlanModal from './components/AIReorderPlanModal';
import ItemDetailModal from './components/ItemDetailModal';
import StockOpModal from './components/StockOpModal';
import NewPOModal from './components/NewPOModal';
import ReceivePOModal from './components/ReceivePOModal';
import CycleCountModal from './components/CycleCountModal';

import { api } from './services/api';
import { useWebSocket } from './hooks/useWebSocket';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [simStatus, setSimStatus] = useState(null);
  const [toasts, setToasts] = useState([]);
  const lastToastForProductRef = useRef({});

  // Modals state
  const [isAIPlanOpen, setIsAIPlanOpen] = useState(false);
  const [aiPlanProductIds, setAiPlanProductIds] = useState(null);

  const [selectedProductId, setSelectedProductId] = useState(null);
  const [isItemDetailOpen, setIsItemDetailOpen] = useState(false);

  const [isStockOpOpen, setIsStockOpOpen] = useState(false);
  const [isNewPOOpen, setIsNewPOOpen] = useState(false);
  const [receivePOData, setReceivePOData] = useState(null);
  const [isCycleCountOpen, setIsCycleCountOpen] = useState(false);

  // 1. Initial Data Fetching
  const fetchAllInitialData = useCallback(async () => {
    try {
      const [dashRes, prodsRes, catsRes, supsRes, locsRes, alertsRes, simRes] = await Promise.all([
        api.getDashboard().catch(() => null),
        api.getProducts().catch(() => []),
        api.getCategories().catch(() => []),
        api.getSuppliers().catch(() => []),
        api.getLocations().catch(() => []),
        api.getAlerts({ limit: 20 }).catch(() => []),
        api.getSimulationStatus().catch(() => null)
      ]);

      if (dashRes) setDashboardStats(dashRes);
      if (prodsRes) setProducts(prodsRes);
      if (catsRes) setCategories(catsRes);
      if (supsRes) setSuppliers(supsRes);
      if (locsRes) setLocations(locsRes);
      if (alertsRes) setAlerts(alertsRes);
      if (simRes) setSimStatus(simRes);
    } catch (err) {
      console.error('Initial data loading error:', err);
    }
  }, []);

  useEffect(() => {
    fetchAllInitialData();
  }, [fetchAllInitialData]);

  // Toast notification management
  const addToast = useCallback((toastData) => {
    if (!toastData) return;
    const key = toastData.product_id || toastData.product_name;
    const now = Date.now();
    // Throttle duplicate toasts for the same item to once per 5 seconds
    if (key && lastToastForProductRef.current[key] && now - lastToastForProductRef.current[key] < 5000) {
      return;
    }
    if (key) {
      lastToastForProductRef.current[key] = now;
    }

    const newToast = {
      id: toastData.id || `toast-${Date.now()}-${Math.random()}`,
      product_id: toastData.product_id,
      product_name: toastData.product_name || 'Product',
      current_stock: toastData.current_stock ?? 0,
      reorder_point: toastData.reorder_point ?? 0,
      severity: toastData.severity || 'WARNING',
      alert_type: toastData.alert_type || 'REORDER_BREACH',
      message: toastData.message || `Stock (${toastData.current_stock}) has dropped to/below reorder threshold (${toastData.reorder_point}).`,
      order_placed: false,
      created_at: Date.now()
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 3)]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 2. Real-time WebSocket Event Handler
  const handleWebSocketEvent = useCallback((eventPayload) => {
    const { event, data } = eventPayload;

    if (event === 'INITIAL_SNAPSHOT') {
      if (data.dashboard_stats) setDashboardStats(data.dashboard_stats);
      if (data.dashboard_stats?.recent_alerts) setAlerts(data.dashboard_stats.recent_alerts);
      if (data.simulator_status) setSimStatus(data.simulator_status);
    } else if (event === 'SIMULATION_TRANSACTION') {
      if (data.simulator_status) setSimStatus(data.simulator_status);
      if (data.dashboard_stats) setDashboardStats(data.dashboard_stats);
      if (data.dashboard_stats?.recent_alerts) setAlerts(data.dashboard_stats.recent_alerts);

      // Trigger notification if reorder point was breached
      if (data.notification) {
        addToast(data.notification);
      } else if (data.processed_transaction) {
        const pt = data.processed_transaction;
        if (pt.reorder_breached || (pt.reorder_point && pt.new_stock <= pt.reorder_point)) {
          addToast({
            product_id: pt.product_id,
            product_name: pt.product_name,
            current_stock: pt.new_stock,
            reorder_point: pt.reorder_point,
            severity: pt.new_stock <= 0 ? 'CRITICAL' : 'WARNING',
            alert_type: pt.new_stock <= 0 ? 'STOCKOUT' : 'REORDER_BREACH'
          });
        }
      }

      // Dynamically update product stock in catalog without full reload
      if (data.processed_transaction) {
        const pt = data.processed_transaction;
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === pt.product_id) {
              const updatedStock = pt.new_stock;
              let status = 'IN STOCK';
              if (updatedStock === 0) status = 'OUT OF STOCK';
              else if (updatedStock <= p.reorder_point) status = 'LOW STOCK';

              return {
                ...p,
                current_stock: updatedStock,
                stock_status: status,
                latest_prediction: {
                  ...p.latest_prediction,
                  stockout_risk: pt.stockout_risk,
                  inventory_status: pt.inventory_status,
                  recommended_reorder_quantity: pt.recommended_reorder_qty,
                  recommendation: pt.decision
                }
              };
            }
            return p;
          })
        );
      }
    } else if (event === 'MANUAL_TRANSACTION') {
      if (data.dashboard_stats) setDashboardStats(data.dashboard_stats);
      if (data.dashboard_stats?.recent_alerts) setAlerts(data.dashboard_stats.recent_alerts);
      if (data.notification) {
        addToast(data.notification);
      } else if (data.reorder_breached || (data.reorder_point && data.new_stock <= data.reorder_point)) {
        addToast({
          product_id: data.product_id,
          product_name: data.product_name,
          current_stock: data.new_stock,
          reorder_point: data.reorder_point,
          severity: data.new_stock <= 0 ? 'CRITICAL' : 'WARNING',
          alert_type: data.new_stock <= 0 ? 'STOCKOUT' : 'REORDER_BREACH'
        });
      }
    } else if (event === 'STOCK_UPDATED') {
      if (data.product_id) {
        setProducts((prev) =>
          prev.map((p) => (p.id === data.product_id ? { ...p, current_stock: data.current_stock ?? data.new_stock } : p))
        );
      }
      api.getDashboard().then(setDashboardStats).catch(console.error);
    } else if (event === 'AI_REORDER_ALERT') {
      if (data.notification) {
        addToast(data.notification);
      } else {
        addToast({
          product_id: data.product_id,
          product_name: data.product_name,
          current_stock: data.current_stock,
          reorder_point: data.reorder_point,
          severity: 'CRITICAL',
          alert_type: 'REORDER_BREACH',
          message: `🔔 AI Reorder Alert: ${data.product_name} stock (${data.current_stock}) has reached a critical level. Reorder recommendation requires manager approval.`
        });
      }
      api.getDashboard().then(setDashboardStats).catch(console.error);
      api.getAlerts({ limit: 20 }).then(setAlerts).catch(console.error);
    } else if (event === 'RECOMMENDATION_APPROVED') {
      addToast({
        product_name: 'Reorder Approved',
        severity: 'INFO',
        alert_type: 'GENERAL',
        message: data.message || `Purchase Order ${data.po_number} created as DRAFT. Inventory remains unchanged at ${data.current_stock}.`
      });
      api.getDashboard().then(setDashboardStats).catch(console.error);
    } else if (event === 'RECOMMENDATION_REJECTED') {
      api.getDashboard().then(setDashboardStats).catch(console.error);
    } else if (event === 'PO_RECEIVED' || event === 'DRAFT_POS_CREATED' || event === 'STOCK_COUNT_COMPLETED') {
      if (event === 'PO_RECEIVED' && data.message) {
        addToast({
          product_name: data.product_name || 'Delivery Confirmed',
          severity: 'INFO',
          alert_type: 'GENERAL',
          message: data.message
        });
      }
      if (data.dashboard_stats) setDashboardStats(data.dashboard_stats);
      if (data.dashboard_stats?.recent_alerts) setAlerts(data.dashboard_stats.recent_alerts);
      api.getDashboard().then(setDashboardStats).catch(console.error);
      api.getProducts().then(setProducts).catch(console.error);
      api.getAlerts({ limit: 20 }).then(setAlerts).catch(console.error);
    }
  }, [addToast]);

  const { isConnected } = useWebSocket(handleWebSocketEvent);

  // Modal open helpers
  const handleOpenItemDetail = (id) => {
    setSelectedProductId(id);
    setIsItemDetailOpen(true);
  };

  const handleOpenAIPlanWithIds = (ids = null) => {
    setAiPlanProductIds(ids);
    setIsAIPlanOpen(true);
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard': return 'Warehouse Operations Intelligence';
      case 'items': return 'Product Catalog & Inventory Balances';
      case 'transactions': return 'Warehouse Transaction Ledger';
      case 'stock-ops': return 'Manual Stock Operations Console';
      case 'purchase-orders': return 'Purchase Orders Management';
      case 'reorder-queue': return 'Calculated Reorder Queue';
      case 'counts': return 'Physical Cycle Counts & Reconciliation';
      case 'suppliers': return 'Certified Supplier Matrix';
      case 'predictions': return 'Machine Learning Predictions & Inferences';
      case 'agents': return 'Multi-Agent Autonomous Monitor';
      case 'simulation': return 'Transaction Replay Simulator Control';
      case 'admin': return 'Catalog Administration';
      default: return 'Warehouse AI';
    }
  };

  return (
    <div className="app-container">
      {/* Real-time Reorder Point Breach Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        onViewProduct={handleOpenItemDetail}
        onNavigateReorderQueue={() => setCurrentPage('reorder-queue')}
      />

      {/* Left Sidebar */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        pendingReordersCount={dashboardStats?.pending_ai_recommendations ?? dashboardStats?.pending_reorders_count ?? 0}
        activeAlertsCount={alerts.filter(a => !a.is_read).length}
      />

      <div className="main-wrapper">
        {/* Top Sticky Transaction Simulator Telemetry Bar */}
        <SimulationBar
          simStatus={simStatus}
          onStatusChange={(updated) => setSimStatus(updated)}
        />

        {/* Global Top Navbar */}
        <Navbar
          pageTitle={getPageTitle()}
          isConnected={isConnected}
          alerts={alerts}
          onOpenStockOp={() => setIsStockOpOpen(true)}
          onOpenAIPlan={() => handleOpenAIPlanWithIds(null)}
          onAlertMarkRead={(id) => {
            setAlerts((prev) => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
          }}
        />

        {/* Dynamic Page Router */}
        <main className="main-content">
          {currentPage === 'dashboard' && (
            <Dashboard
              stats={dashboardStats}
              onOpenAIPlan={() => handleOpenAIPlanWithIds(null)}
              onSelectItem={handleOpenItemDetail}
              onRefresh={fetchAllInitialData}
              onNavigate={setCurrentPage}
            />
          )}

          {currentPage === 'items' && (
            <ItemsPage
              products={products}
              categories={categories}
              suppliers={suppliers}
              onSelectItem={handleOpenItemDetail}
              onOpenNewProduct={() => setCurrentPage('admin')}
            />
          )}

          {currentPage === 'transactions' && (
            <TransactionsPage
              products={products}
              locations={locations}
              onSelectItem={handleOpenItemDetail}
            />
          )}

          {currentPage === 'stock-ops' && (
            <StockOpsPage
              products={products}
              locations={locations}
              onTransactionSuccess={fetchAllInitialData}
            />
          )}

          {currentPage === 'purchase-orders' && (
            <PurchaseOrdersPage
              suppliers={suppliers}
              products={products}
              locations={locations}
              onOpenNewPO={() => setIsNewPOOpen(true)}
              onOpenReceivePO={(po) => setReceivePOData(po)}
            />
          )}

          {currentPage === 'reorder-queue' && (
            <ReorderQueue
              onSelectItem={handleOpenItemDetail}
              onQueueUpdated={fetchAllInitialData}
            />
          )}

          {currentPage === 'counts' && (
            <CountsPage
              onOpenNewCount={() => setIsCycleCountOpen(true)}
            />
          )}

          {currentPage === 'suppliers' && (
            <SuppliersPage />
          )}

          {currentPage === 'predictions' && (
            <PredictionsPage
              products={products}
              onSelectItem={handleOpenItemDetail}
            />
          )}

          {currentPage === 'inventory-ai' && (
            <InventoryAI dashboardStats={dashboardStats} />
          )}

          {currentPage === 'agents' && (
            <AgentMonitorPage />
          )}

          {currentPage === 'simulation' && (
            <SimulationPage
              simStatus={simStatus}
              onStatusChange={(updated) => setSimStatus(updated)}
            />
          )}

          {currentPage === 'admin' && (
            <AdminPage
              categories={categories}
              suppliers={suppliers}
              locations={locations}
              onCatalogChanged={fetchAllInitialData}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <AIReorderPlanModal
        isOpen={isAIPlanOpen}
        onClose={() => setIsAIPlanOpen(false)}
        selectedProductIds={aiPlanProductIds}
        onPlanExecuted={fetchAllInitialData}
      />

      <ItemDetailModal
        productId={selectedProductId}
        isOpen={isItemDetailOpen}
        onClose={() => {
          setIsItemDetailOpen(false);
          setSelectedProductId(null);
        }}
      />

      <StockOpModal
        isOpen={isStockOpOpen}
        onClose={() => setIsStockOpOpen(false)}
        onSuccess={fetchAllInitialData}
        products={products}
        locations={locations}
      />

      <NewPOModal
        isOpen={isNewPOOpen}
        onClose={() => setIsNewPOOpen(false)}
        onSuccess={fetchAllInitialData}
        suppliers={suppliers}
        products={products}
      />

      {receivePOData && (
        <ReceivePOModal
          po={receivePOData}
          isOpen={!!receivePOData}
          onClose={() => setReceivePOData(null)}
          onSuccess={fetchAllInitialData}
          locations={locations}
        />
      )}

      <CycleCountModal
        isOpen={isCycleCountOpen}
        onClose={() => setIsCycleCountOpen(false)}
        onSuccess={fetchAllInitialData}
        locations={locations}
        products={products}
      />
    </div>
  );
}
