/**
 * Dashboard View — Main overview page
 *
 * Shows: stat cards, Loan Readiness Gauge, recent insights, quick record button
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, actionTypes } from '../state/AppContext';
import { vendorAPI, insightAPI, ledgerAPI } from '../api';
import LoanGauge from '../components/common/LoanGauge';
import StatCard from '../components/common/StatCard';
import InsightCard from '../components/common/InsightCard';

export default function Dashboard() {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [recentInsights, setRecentInsights] = useState([]);

  useEffect(() => {
    if (!state.vendorId) return;
    fetchDashboard();
  }, [state.vendorId]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, loanRes, insightRes] = await Promise.all([
        vendorAPI.getDashboard(state.vendorId),
        vendorAPI.getLoanScore(state.vendorId),
        insightAPI.getUnread(state.vendorId),
      ]);

      const dash = dashRes.data.data;
      dispatch({ type: actionTypes.SET_VENDOR, payload: dash.vendor });
      dispatch({ type: actionTypes.SET_LOAN_SCORE, payload: loanRes.data.data });
      setSummary(dash.summary);
      setRecentInsights(insightRes.data.data || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="stagger-children">
        <div className="section-title">Dashboard</div>
        <div className="grid grid-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </div>
    );
  }

  const loan = state.loanScore || {};

  return (
    <div className="stagger-children">
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            fontWeight: 800,
          }}
        >
          Namaste, <span className="gradient-text">{state.vendor?.name || 'Vendor'}</span> 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Here&apos;s your business at a glance
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
        <StatCard
          icon="💰"
          value={`₹${(summary?.totalRevenue || 0).toLocaleString('en-IN')}`}
          label="30-Day Revenue"
          bgColor="rgba(34, 197, 94, 0.15)"
        />
        <StatCard
          icon="📊"
          value={`₹${(summary?.totalProfit || 0).toLocaleString('en-IN')}`}
          label="30-Day Profit"
          bgColor="rgba(99, 102, 241, 0.15)"
        />
        <StatCard
          icon="📅"
          value={summary?.entryCount || 0}
          label="Days Logged"
          bgColor="rgba(168, 85, 247, 0.15)"
        />
        <StatCard
          icon="📉"
          value={`₹${(summary?.totalMissedRevenue || 0).toLocaleString('en-IN')}`}
          label="Missed Revenue"
          bgColor="rgba(239, 68, 68, 0.15)"
        />
      </div>

      {/* Main Content: Gauge + Quick Actions + Insights */}
      <div className="grid grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Loan Readiness Gauge */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)' }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            🎯 Micro-Loan Readiness
          </h2>
          <LoanGauge
            score={loan.score || 0}
            isReady={loan.isLoanReady || false}
            streak={loan.streak || 0}
          />

          {/* Score Breakdown */}
          <div style={{ width: '100%', marginTop: 'var(--space-sm)' }}>
            {loan.breakdown && Object.entries(loan.breakdown).map(([key, val]) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  padding: '4px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <span>{formatBreakdownLabel(key)}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {Math.round(val * 10) / 10}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions + Record CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Record CTA */}
          <Link to="/record" style={{ textDecoration: 'none' }}>
            <div
              className="glass-card"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))',
                cursor: 'pointer',
                textAlign: 'center',
                padding: 'var(--space-xl)',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: 'var(--space-sm)' }}>🎙️</div>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  marginBottom: 'var(--space-xs)',
                }}
              >
                Record Today&apos;s Sales
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Tap and speak — your voice becomes business data
              </p>
            </div>
          </Link>

          {/* Avg Daily Revenue */}
          <div className="glass-card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              Avg Daily Revenue
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 800,
              }}
            >
              ₹{Math.round(summary?.avgDailyRevenue || 0).toLocaleString('en-IN')}
            </div>
          </div>

          {/* PDF Export */}
          <button
            className="btn btn-secondary btn-lg"
            style={{ width: '100%' }}
            onClick={handleDownloadPDF}
          >
            📄 Download Earnings PDF
          </button>
        </div>
      </div>

      {/* Recent Insights */}
      {recentInsights.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              💡 Latest Insights
            </h2>
            <Link to="/insights" className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
              View All →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {recentInsights.slice(0, 3).map((insight) => (
              <InsightCard key={insight._id} insight={insight} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  async function handleDownloadPDF() {
    try {
      const { pdfAPI } = await import('../api');
      const res = await pdfAPI.downloadEarnings(state.vendorId, 30);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'VoiceTrace_Earnings.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
    }
  }
}

function formatBreakdownLabel(key) {
  const labels = {
    streakScore: '🔥 Logging Streak',
    stabilityScore: '📈 Revenue Stability',
    revenueScore: '💰 Avg Revenue',
    expenseScore: '💸 Expense Tracking',
    profileScore: '👤 Profile Complete',
  };
  return labels[key] || key;
}
