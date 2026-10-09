/**
 * src/pages/InventoryAI.jsx
 * Unified Generative AI Workspace:
 * 1. Inventory AI Assistant (Real-time Q&A Chatbot)
 * 2. Daily Inventory Summary (Executive AI Overview)
 * 3. Specialized AI Reports (Operations, Velocity, Risk, Suppliers)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  RefreshCw,
  FileText,
  AlertCircle,
  ShieldCheck,
  Cpu,
  Layers,
  CheckCircle2,
  TrendingUp,
  Boxes,
  HelpCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function InventoryAI({ dashboardStats }) {
  const [activeTab, setActiveTab] = useState('assistant'); // 'assistant' | 'summary' | 'reports'
  const [aiStatus, setAiStatus] = useState({ configured: false, model: 'gemini-2.5-flash' });

  // Chat State
  const [messages, setMessages] = useState([
    {
      sender: 'gemini',
      text: "Hello! I am your AI Warehouse Inventory Assistant powered by Google Gemini. I analyze your real-time inventory balances, ML predictions, and agent recommendations. Ask me anything about current stock, reorder priorities, or warehouse trends.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // Daily Summary State
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Reports State
  const [selectedReportType, setSelectedReportType] = useState('daily_inventory');
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Check Gemini status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatLoading]);

  const checkStatus = async () => {
    try {
      const res = await api.getAIStatus();
      if (res) setAiStatus(res);
    } catch (err) {
      console.warn('Could not fetch AI status:', err);
    }
  };

  // 1. Chatbot Handlers
  const handleSendQuestion = async (qText) => {
    const textToSend = qText || inputQuestion;
    if (!textToSend.trim() || chatLoading) return;

    const userMsg = {
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setChatLoading(true);

    try {
      const res = await api.askAIChat(userMsg.text);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'gemini',
          text: res.answer,
          success: res.success,
          error: res.error,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'gemini',
          text: "Unable to generate AI response. Please try again or check backend configuration.",
          error: err.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // 2. Daily Summary Handlers
  const handleGenerateSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await api.getDailySummary();
      setSummaryData(res);
    } catch (err) {
      alert(`Summary generation error: ${err.message}`);
    } finally {
      setSummaryLoading(false);
    }
  };

  // 3. Reports Handlers
  const handleGenerateReport = async () => {
    try {
      setReportLoading(true);
      const res = await api.generateAIReport(selectedReportType);
      setReportData(res);
    } catch (err) {
      alert(`Report generation error: ${err.message}`);
    } finally {
      setReportLoading(false);
    }
  };

  const sampleQuestions = [
    "Which products need reordering?",
    "Why should I reorder laptops?",
    "Which products have high stockout risk?",
    "Give me today's inventory summary.",
    "Which products have the lowest stock?",
    "What are the most important inventory problems right now?",
    "Explain the current reorder recommendations.",
    "Summarize recent inventory transactions.",
    "Summarize the current purchase orders."
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Banner & Status */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(147, 51, 234, 0.04) 100%)',
          border: '1px solid rgba(79, 70, 229, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            className="brand-icon-box"
            style={{
              width: '42px',
              height: '42px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#ffffff'
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Inventory AI & Executive Intelligence
              </h2>
              <span className={`badge ${aiStatus.configured ? 'badge-success' : 'badge-warning'}`} style={{ padding: '3px 9px' }}>
                {aiStatus.configured ? 'Gemini API Active' : 'API Key Setup Required'}
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '4px 0 0', maxWidth: '700px' }}>
              Generative AI layer powered by Google Gemini. Synthesizes ML forecasts and 5-agent telemetry into natural-language
              explanations, operational chats, and executive warehouse summaries.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right', fontSize: '0.78rem' }}>
            <div style={{ color: 'var(--text-muted)' }}>Target Model</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {aiStatus.model}
            </div>
          </div>
        </div>
      </div>

      {/* Warning banner if Gemini API key not configured */}
      {!aiStatus.configured && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.84rem',
            color: '#b45309'
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Gemini API Key Missing or Not Activated:</strong> To enable real-time Gemini text generation, set{' '}
            <code style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
              GEMINI_API_KEY=your_key
            </code>{' '}
            in the project's <code style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px' }}>.env</code> file.
            The rest of the warehouse inventory, machine learning models, and 5 agents continue running uninterrupted.
          </div>
          <button className="btn btn-secondary btn-sm" onClick={checkStatus}>
            <RefreshCw size={13} />
            <span>Check Status</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '2px' }}>
        <button
          className={`btn ${activeTab === 'assistant' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('assistant')}
          style={{ padding: '9px 18px', fontSize: '0.85rem' }}
        >
          <Bot size={16} />
          <span>Inventory AI Assistant</span>
        </button>

        <button
          className={`btn ${activeTab === 'summary' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('summary')}
          style={{ padding: '9px 18px', fontSize: '0.85rem' }}
        >
          <FileText size={16} />
          <span>Daily Inventory Summary</span>
        </button>

        <button
          className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('reports')}
          style={{ padding: '9px 18px', fontSize: '0.85rem' }}
        >
          <Layers size={16} />
          <span>Executive AI Reports</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: INVENTORY AI ASSISTANT (CHAT)                     */}
      {/* ======================================================== */}
      {activeTab === 'assistant' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '20px', alignItems: 'start' }}>
          {/* Main Chat Box */}
          <div
            className="card"
            style={{
              padding: '0',
              display: 'flex',
              flexDirection: 'column',
              height: '620px',
              overflow: 'hidden'
            }}
          >
            {/* Chat Header */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="brand-icon-box" style={{ width: '28px', height: '28px', background: 'var(--primary)', color: '#fff' }}>
                  <Bot size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    Warehouse AI Chat
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Directly grounded in SQLite balances & ML model outputs
                  </div>
                </div>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setMessages([
                    {
                      sender: 'gemini',
                      text: 'Chat history cleared. How may I assist with your warehouse management today?',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  ])
                }
                style={{ fontSize: '0.72rem', padding: '4px 10px' }}
              >
                Clear Chat
              </button>
            </div>

            {/* Chat Messages Thread */}
            <div
              style={{
                flex: 1,
                padding: '20px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', padding: '0 4px' }}>
                    {m.sender === 'user' ? 'You' : 'Gemini AI Assistant'} • {m.timestamp}
                  </div>
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.88rem',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-line',
                      background: m.sender === 'user'
                        ? 'var(--primary)'
                        : (m.error ? 'rgba(239, 68, 68, 0.08)' : '#f1f5f9'),
                      color: m.sender === 'user'
                        ? '#ffffff'
                        : (m.error ? 'var(--danger)' : 'var(--text-primary)'),
                      border: m.sender === 'user'
                        ? 'none'
                        : `1px solid ${m.error ? 'rgba(239, 68, 68, 0.25)' : 'var(--border-subtle)'}`
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.84rem', padding: '10px' }}>
                  <RefreshCw size={16} className="animate-spin" color="var(--primary)" />
                  <span>Gemini is analyzing warehouse inventory...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuestion();
              }}
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: '10px',
                background: '#ffffff'
              }}
            >
              <input
                type="text"
                className="input"
                placeholder="Ask me about your warehouse inventory..."
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                disabled={chatLoading}
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={chatLoading || !inputQuestion.trim()}
                style={{ padding: '0 20px' }}
              >
                <Send size={16} />
                <span>Ask AI</span>
              </button>
            </form>
          </div>

          {/* Suggested Quick Questions Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <HelpCircle size={16} color="var(--primary)" />
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Suggested Questions
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendQuestion(q)}
                    disabled={chatLoading}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      lineHeight: '1.4'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(79, 70, 229, 0.08)';
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.color = 'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>

            {/* Human in the loop card */}
            <div
              className="card"
              style={{
                padding: '16px',
                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.04) 0%, rgba(99, 102, 241, 0.01) 100%)',
                border: '1px solid rgba(79, 70, 229, 0.2)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShieldCheck size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Human-in-the-Loop Safe
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Gemini provides decision support. It cannot auto-purchase items, modify database records, or finalize purchase orders without explicit manager approval.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DAILY INVENTORY SUMMARY                           */}
      {/* ======================================================== */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Daily Executive Inventory Summary
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Aggregates all 54 SKUs, active stockout risks, pending purchase orders, and recent transactions into an executive brief.
                </p>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleGenerateSummary}
                disabled={summaryLoading}
                style={{ padding: '10px 20px' }}
              >
                <RefreshCw size={16} className={summaryLoading ? 'animate-spin' : ''} />
                <span>{summaryLoading ? 'Analyzing Warehouse...' : 'Generate Today\'s Summary'}</span>
              </button>
            </div>

            {/* Content view */}
            {summaryLoading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Gemini is synthesizing daily inventory telemetry...
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Processing SKU balances, 30-day velocity models, open purchase orders, and stockout alerts.
                </p>
              </div>
            ) : summaryData ? (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {summaryData.kpis && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Monitored SKUs</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{summaryData.kpis.total_skus}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Low Stock Items</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)' }}>{summaryData.kpis.low_stock}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Out of Stock</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)' }}>{summaryData.kpis.out_of_stock}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Pending AI Reorders</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{summaryData.kpis.pending_reorders}</div>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px',
                    fontSize: '0.92rem',
                    lineHeight: '1.7',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-line'
                  }}
                >
                  {summaryData.summary}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '48px 0',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: 'var(--radius-md)',
                  marginTop: '16px',
                  color: 'var(--text-muted)'
                }}
              >
                <FileText size={36} style={{ margin: '0 auto 12px', color: 'var(--primary)', opacity: 0.6 }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  Click <strong>"Generate Today's Summary"</strong> to produce an executive briefing with Gemini.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: SPECIALIZED AI REPORTS                            */}
      {/* ======================================================== */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Specialized AI Inventory Reports
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Select an operational domain to generate a structured analysis report with Gemini GenAI.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  className="input"
                  value={selectedReportType}
                  onChange={(e) => setSelectedReportType(e.target.value)}
                  style={{ minWidth: '260px' }}
                >
                  <option value="daily_inventory">Daily Inventory Operations Report</option>
                  <option value="weekly_inventory">Weekly Velocity & Demand Report</option>
                  <option value="reorder_risk">Reorder & Replenishment Risk Report</option>
                  <option value="stockout_risk">Stockout Risk Exposure Report</option>
                  <option value="supplier_po">Supplier Performance & PO Report</option>
                </select>

                <button
                  className="btn btn-primary"
                  onClick={handleGenerateReport}
                  disabled={reportLoading}
                  style={{ padding: '9px 18px' }}
                >
                  <Sparkles size={16} className={reportLoading ? 'animate-spin' : ''} />
                  <span>{reportLoading ? 'Generating Report...' : 'Generate Report'}</span>
                </button>
              </div>
            </div>

            {reportLoading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Gemini is drafting your executive report...
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Compiling historical velocity, supplier metrics, and machine learning risks.
                </p>
              </div>
            ) : reportData ? (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px',
                  fontSize: '0.92rem',
                  lineHeight: '1.7',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-line'
                }}
              >
                {reportData.report}
              </div>
            ) : (
              <div
                style={{
                  padding: '48px 0',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-muted)'
                }}
              >
                <Layers size={36} style={{ margin: '0 auto 12px', color: 'var(--primary)', opacity: 0.6 }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  Select a report type above and click <strong>"Generate Report"</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
