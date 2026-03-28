/**
 * Dashboard View — Bento Grid Layout (Redesigned)
 *
 * Modern consumer-app aesthetic with:
 * - Asymmetric Bento grid layout
 * - Modern stat cards with gradient accents
 * - AI Insights tall card spanning 2 rows
 * - Gradient hero Record CTA
 * - Weekly patterns as bento cards
 * - Loan readiness at bottom
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, actionTypes } from '../state/AppContext';
import { vendorAPI, insightAPI, ledgerAPI, analyticsAPI } from '../api';
import LoanGauge from '../components/common/LoanGauge';
import StatCard from '../components/common/StatCard';
import InsightCard from '../components/common/InsightCard';
import AnomalyAlert from '../components/common/AnomalyAlert';
import ClarificationBanner from '../components/common/ClarificationBanner';

export default function Dashboard() {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [recentInsights, setRecentInsights] = useState([]);
  const [weeklyPatterns, setWeeklyPatterns] = useState(null);
  const [todayAnomaly, setTodayAnomaly] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [smartTips, setSmartTips] = useState([]);

  useEffect(() => {
    if (!state.vendorId) return;
    fetchDashboard();
  }, [state.vendorId]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, loanRes, insightRes, analyticsRes, todayRes] = await Promise.all([
        vendorAPI.getDashboard(state.vendorId),
        vendorAPI.getLoanScore(state.vendorId),
        insightAPI.getUnread(state.vendorId),
        analyticsAPI.getWeekly(state.vendorId).catch(() => null),
        ledgerAPI.getToday(state.vendorId).catch(() => null),
      ]);

      const dash = dashRes.data.data;
      dispatch({ type: actionTypes.SET_VENDOR, payload: dash.vendor });
      dispatch({ type: actionTypes.SET_LOAN_SCORE, payload: loanRes.data.data });
      setSummary(dash.summary);
      setRecentInsights(insightRes.data.data || []);

      if (analyticsRes?.data?.data) {
        setWeeklyPatterns(analyticsRes.data.data);
      }

      if (todayRes?.data?.data?.anomaly?.detected) {
        setTodayAnomaly(todayRes.data.data.anomaly);
      }

      try {
        const [smartRes, weatherRes] = await Promise.all([
          insightAPI.getSmartInsights(state.vendorId).catch(() => null),
          insightAPI.getWeatherForecast().catch(() => null),
        ]);

        if (weatherRes?.data?.data) {
          const w = weatherRes.data.data;
          const temp = Math.round(w.temperature || w.temp || 28);
          const condition = w.condition || w.description || 'Clear';
          const icon = condition.toLowerCase().includes('rain') ? '🌧️'
            : condition.toLowerCase().includes('cloud') ? '☁️'
            : condition.toLowerCase().includes('snow') ? '❄️' : '☀️';
          const advice = w.businessAdvice || w.advice || 'Good conditions for business!';
          setWeatherData({ temp, condition, icon, advice });
        }

        if (smartRes?.data?.data?.insights) {
          const tips = smartRes.data.data.insights
            .filter(i => i.type !== 'welcome')
            .slice(0, 3)
            .map(i => i.title + (i.subtitle ? ' — ' + i.subtitle : ''));
          setSmartTips(tips);
        }
      } catch (e) {
        console.warn('Smart insights fetch (non-critical):', e);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ paddingTop: 'var(--space-lg)' }}>
        <div className="section-title">Dashboard</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-3xl)' }} />
          ))}
        </div>
      </div>
    );
  }

  const loan = state.loanScore || {};

  return (
    <div className="stagger-children">
      {/* Clarification Banner */}
      <ClarificationBanner vendorId={state.vendorId} />

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.85rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
          }}
        >
          Namaste, <span className="gradient-text">{state.vendor?.name || 'Vendor'}</span> 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px', fontWeight: 500 }}>
          Here&apos;s your business at a glance
        </p>
      </div>

      {/* Anomaly Alert */}
      {todayAnomaly && <AnomalyAlert anomaly={todayAnomaly} />}

      {/* ═══════════ BENTO GRID ═══════════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'auto auto',
          gap: '16px',
          marginBottom: '24px',
        }}
        className="bento-stat-grid"
      >
        {/* Row 1: 4 Stat Cards */}
        <StatCard
          icon="💰"
          value={`₹${(summary?.totalRevenue || 0).toLocaleString('en-IN')}`}
          label="30-Day Revenue"
          bgColor="rgba(34, 197, 94, 0.12)"
        />
        <StatCard
          icon="📊"
          value={`₹${(summary?.totalProfit || 0).toLocaleString('en-IN')}`}
          label="30-Day Profit"
          bgColor="rgba(99, 102, 241, 0.12)"
        />
        <StatCard
          icon="📅"
          value={summary?.entryCount || 0}
          label="Days Logged"
          bgColor="rgba(168, 85, 247, 0.12)"
        />
        <StatCard
          icon="📉"
          value={`₹${(summary?.totalMissedRevenue || 0).toLocaleString('en-IN')}`}
          label="Missed Revenue"
          bgColor="rgba(239, 68, 68, 0.12)"
        />
      </div>

      {/* ═══════════ INSIGHTS + ACTIONS ROW ═══════════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px',
        }}
        className="bento-actions-grid"
      >
        {/* AI Insights Box */}
        <div
          id="dashboard-insights-box"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-3xl)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
          }}
        >
          {/* Subtle gradient accent */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'var(--gradient-primary)',
            borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
          }} />

          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.1rem',
            fontWeight: 800,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            💡 AI Insights
          </h2>

          {/* Weather Preview */}
          {weatherData ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 16px',
                background: 'rgba(34, 197, 94, 0.04)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(34, 197, 94, 0.08)',
              }}
            >
              <div style={{ fontSize: '2rem' }}>
                {weatherData.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                  Tomorrow: {weatherData.temp}°C {weatherData.condition}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {weatherData.advice}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.02)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>🌤️</span>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Loading weather forecast...
              </div>
            </div>
          )}

          {/* Smart Tips */}
          {smartTips.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {smartTips.slice(0, 3).map((tip, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                    padding: '8px 0',
                    borderBottom: i < Math.min(smartTips.length, 3) - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', flexShrink: 0 }}>
                    {['🎯', '📊', '💡'][i % 3]}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {tip}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Log your first day to unlock personalized insights!
            </div>
          )}

          <Link
            to="/app/insights"
            className="btn btn-primary"
            style={{ fontSize: '0.82rem', textDecoration: 'none', textAlign: 'center', marginTop: 'auto', borderRadius: 'var(--radius-lg)' }}
          >
            View Full Insights →
          </Link>
        </div>

        {/* Right Column: Record CTA + Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Record CTA Hero */}
          <Link to="/app/record" style={{ textDecoration: 'none' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))',
                border: '1px solid rgba(99,102,241,0.15)',
                borderRadius: 'var(--radius-3xl)',
                padding: '32px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 40px -8px rgba(99,102,241,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '2.8rem', marginBottom: '8px' }}>🎙️</div>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  marginBottom: '4px',
                  color: 'var(--text-primary)',
                }}
              >
                Record Today&apos;s Sales
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                Tap and speak — your voice becomes business data
              </p>
            </div>
          </Link>

          {/* Avg Revenue Card */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-3xl)',
              padding: '20px 24px',
              boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Avg Daily Revenue
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
              }}
            >
              ₹{Math.round(summary?.avgDailyRevenue || 0).toLocaleString('en-IN')}
            </div>
          </div>

          {/* PDF Export */}
          <button
            className="btn btn-secondary"
            style={{
              width: '100%',
              borderRadius: 'var(--radius-lg)',
              padding: '14px',
              fontSize: '0.88rem',
            }}
            onClick={handleDownloadPDF}
          >
            📄 Download Earnings PDF
          </button>
        </div>
      </div>

      {/* ═══════════ WEEKLY OBSERVATIONS ═══════════ */}
      {weeklyPatterns?.plainInsights?.length > 0 && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-3xl)',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
          }}
        >
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>
            🧠 Weekly Observations
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {weeklyPatterns.plainInsights.map((insight, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                  padding: '10px 0',
                  borderBottom: i < weeklyPatterns.plainInsights.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>
                  {['💡', '📊', '🎯'][i % 3]}
                </span>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {insight}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ STOCK SUGGESTIONS ═══════════ */}
      {weeklyPatterns?.stockSuggestions?.length > 0 && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-3xl)',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
          }}
        >
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>
            📦 Tomorrow&apos;s Stock Suggestions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {weeklyPatterns.stockSuggestions.map((sug, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'capitalize' }}>
                    {sug.item}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                    — {sug.suggestion}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '40%', textAlign: 'right' }}>
                  {sug.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ WEEKLY PATTERNS (3-col bento) ═══════════ */}
      {weeklyPatterns && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>
            📈 Weekly Patterns
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
            }}
            className="bento-patterns-grid"
          >
            {/* Best Seller */}
            <div
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-3xl)',
                padding: '22px',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #22c55e, #10b981)' }} />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🏆 Best Seller
              </div>
              {weeklyPatterns.bestSeller ? (
                <>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, textTransform: 'capitalize', marginBottom: 4 }}>
                    {weeklyPatterns.bestSeller.name}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {weeklyPatterns.bestSeller.totalQuantity} units · ₹{weeklyPatterns.bestSeller.totalRevenue.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {weeklyPatterns.bestSeller.daysAppeared}/7 days
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No data yet</div>
              )}
            </div>

            {/* Peak Day */}
            <div
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-3xl)',
                padding: '22px',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #6366f1, #a855f7)' }} />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🔥 Peak Day
              </div>
              {weeklyPatterns.peakDay ? (
                <>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, marginBottom: 4 }}>
                    {weeklyPatterns.peakDay.dayName}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    ₹{weeklyPatterns.peakDay.revenue.toLocaleString('en-IN')} revenue
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(weeklyPatterns.peakDay.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No data yet</div>
              )}
            </div>

            {/* Missed Profits */}
            <div
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-3xl)',
                padding: '22px',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #ef4444, #f97316)' }} />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                📉 Missed Profits
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, color: 'var(--danger-400)', marginBottom: 4 }}>
                ~₹{(weeklyPatterns.missedProfits?.totalLoss || 0).toLocaleString('en-IN')}
              </div>
              {weeklyPatterns.missedProfits?.topMissedItems?.length > 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Top: {weeklyPatterns.missedProfits.topMissedItems.slice(0, 2).map((m) => m.item).join(', ')}
                </div>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'var(--success-400)' }}>✅ No missed profits!</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ RECENT INSIGHTS ═══════════ */}
      {recentInsights.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
              💡 Latest Insights
            </h2>
            <Link to="/app/insights" className="btn btn-secondary" style={{ fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}>
              View All →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentInsights.slice(0, 3).map((insight) => (
              <InsightCard key={insight._id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ LOAN READINESS (Bottom) ═══════════ */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-3xl)',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
        }}
      >
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
          🎯 Micro-Loan Readiness
        </h2>
        <LoanGauge
          score={loan.score || 0}
          isReady={loan.isLoanReady || false}
          streak={loan.streak || 0}
        />

        {/* Score Breakdown */}
        <div style={{ width: '100%', maxWidth: '500px', marginTop: '8px' }}>
          {loan.breakdown && Object.entries(loan.breakdown).map(([key, val]) => (
            <div
              key={key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                padding: '6px 0',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <span>{formatBreakdownLabel(key)}</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                {Math.round(val * 10) / 10}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Responsive Overrides ═══ */}
      <style>{`
        @media (max-width: 1024px) {
          .bento-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .bento-patterns-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .bento-stat-grid { grid-template-columns: 1fr !important; }
          .bento-actions-grid { grid-template-columns: 1fr !important; }
          .bento-patterns-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
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
