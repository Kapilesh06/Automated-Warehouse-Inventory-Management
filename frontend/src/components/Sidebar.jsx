/**
 * src/components/Sidebar.jsx
 * Responsive Left Navigation Bar with iconography and status indicators.
 */

import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  TrendingUp,
  ShoppingCart,
  Layers,
  ClipboardCheck,
  Building2,
  Cpu,
  Bot,
  PlaySquare,
  Settings,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ currentPage, setCurrentPage, pendingReordersCount, activeAlertsCount }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Core' },
    { id: 'items', label: 'Items & Catalog', icon: Boxes, section: 'Core' },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight, section: 'Core' },
    { id: 'stock-ops', label: 'Stock In / Out', icon: Layers, section: 'Core' },

    { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, section: 'Replenishment' },
    { id: 'reorder-queue', label: 'Reorder Queue', icon: TrendingUp, badge: pendingReordersCount, section: 'Replenishment' },
    { id: 'counts', label: 'Counts & Adjust', icon: ClipboardCheck, section: 'Replenishment' },
    { id: 'suppliers', label: 'Suppliers', icon: Building2, section: 'Replenishment' },

    { id: 'inventory-ai', label: 'Inventory AI', icon: Sparkles, badge: 'Gemini', section: 'Intelligence' },
    { id: 'predictions', label: 'AI Predictions', icon: Cpu, section: 'Intelligence' },
    { id: 'agents', label: 'AI Agent Monitor', icon: Bot, badge: '5 Active', section: 'Intelligence' },
    { id: 'simulation', label: 'Simulator Control', icon: PlaySquare, section: 'Intelligence' },

    { id: 'admin', label: 'Admin & Catalog', icon: Settings, section: 'System' }
  ];

  const sections = ['Core', 'Replenishment', 'Intelligence', 'System'];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon-box">
          <Bot size={22} />
        </div>
        <div className="brand-title">
          <span>Warehouse AI</span>
          <span className="brand-subtitle">Multi-Agent System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map(section => {
          const items = navItems.filter(item => item.section === section);
          return (
            <React.Fragment key={section}>
              <div className="nav-section-label">{section}</div>
              {items.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
                  >
                    <Icon size={18} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && (
                      <span className={`badge ${typeof item.badge === 'number' && item.badge > 0 ? 'badge-danger' : 'badge-primary'}`} style={{ padding: '2px 7px', fontSize: '0.68rem' }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <ShieldCheck size={16} color="var(--success)" />
          <span>Multi-Agent System 2.0</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          5 ML Models • 12.5k Tx Replay
        </div>
      </div>
    </aside>
  );
}
