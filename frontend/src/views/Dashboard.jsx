/**
 * Dashboard View — Main overview page (Enhanced)
 *
 * Shows:
 * - Stat cards (30-day revenue, profit, days logged, missed revenue)
 * - Loan Readiness Gauge
 * - Phase 2 Feature 3: LLM-generated plain-language weekly insights
 * - Phase 2 Feature 4: Next-day stock suggestions
 * - Phase 4 Feature 7: Anomaly alerts from today's entry
 * - Recent insights feed
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp, actionTypes } from '../state/AppContext';
import { vendorAPI, insightAPI, ledgerAPI, analyticsAPI } from '../api';
import LoanGauge from '../components/common/LoanGauge';
import StatCard from '../components/common/StatCard';
import InsightCard from '../components/common/InsightCard';
import AnomalyAlert from '../components/common/AnomalyAlert';
import ClarificationBanner from '../components/common/ClarificationBanner';

export default function Dashboard() {
  const { state, dispatch } = useApp();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [recentInsights, setRecentInsights] = useState([]);
  const [weeklyPatterns, setWeeklyPatterns] = useState(null);
  const [todayAnomaly, setTodayAnomaly] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [smartTips, setSmartTips] = useState([]);
  const [forecast, setForecast] = useState(null);

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

      // Phase 4 Feature 7: Check today's entry for anomalies
      if (todayRes?.data?.data?.anomaly?.detected) {
        setTodayAnomaly(todayRes.data.data.anomaly);
      }

      // Fetch AI Insights for dashboard box
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

        // Extract demand forecast from ML service
        if (smartRes?.data?.data?.forecast?.topPredictions?.length > 0) {
          setForecast(smartRes.data.data.forecast);
        }
      } catch (e) {
        // Non-critical — dashboard still works without insights
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
      <div className="stagger-children">
        <div className="section-title">{t('nav.dashboard')}</div>
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
      {/* Phase 4 Feature 6: Clarification Banner */}
      <ClarificationBanner vendorId={state.vendorId} />

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
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Phase 4 Feature 7: Today's Anomaly Alert */}
      {todayAnomaly && <AnomalyAlert anomaly={todayAnomaly} />}

      {/* Stat Cards */}
      <div className="grid grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
        <StatCard
          icon="💰"
          value={`₹${(summary?.totalRevenue || 0).toLocaleString('en-IN')}`}
          label={t('dashboard.revenue30d')}
          bgColor="rgba(34, 197, 94, 0.15)"
        />
        <StatCard
          icon="📊"
          value={`₹${(summary?.totalProfit || 0).toLocaleString('en-IN')}`}
          label={t('dashboard.profit30d')}
          bgColor="rgba(99, 102, 241, 0.15)"
        />
        <StatCard
          icon="📅"
          value={summary?.entryCount || 0}
          label={t('dashboard.daysLogged')}
          bgColor="rgba(168, 85, 247, 0.15)"
        />
        <StatCard
          icon="📉"
          value={`₹${(summary?.totalMissedRevenue || 0).toLocaleString('en-IN')}`}
          label={t('dashboard.missedRevenue')}
          bgColor="rgba(239, 68, 68, 0.15)"
        />
      </div>

      {/* Main Content: AI Insights + Quick Actions */}
      <div className="grid grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* AI Insights Summary Box */}
        <div
          className="glass-card"
          id="dashboard-insights-box"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(16, 185, 129, 0.04))',
            borderLeft: '3px solid var(--primary-500)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)',
          }}
        >
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            {t('dashboard.aiInsights')}
          </h2>

          {/* Weather Preview */}
          {weatherData ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-sm) var(--space-md)',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '2.2rem' }}>
                {weatherData.icon === '🌧️' ? '🌧️' :
                 weatherData.icon === '☁️' ? '☁️' :
                 weatherData.icon === '❄️' ? '❄️' : '☀️'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  Tomorrow: {weatherData.temp}°C {weatherData.condition}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {weatherData.advice}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-sm) var(--space-md)',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>🌤️</span>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {t('dashboard.weatherLoading')}
              </div>
            </div>
          )}

          {/* Quick Smart Tips */}
          {smartTips.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              {smartTips.slice(0, 3).map((tip, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 'var(--space-sm)',
                    alignItems: 'flex-start',
                    padding: '6px 0',
                    borderBottom: i < Math.min(smartTips.length, 3) - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '0.82rem', flexShrink: 0 }}>
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
              {t('dashboard.logFirst')}
            </div>
          )}

          <Link
            to="/app/insights"
            className="btn btn-primary"
            style={{ fontSize: '0.82rem', textDecoration: 'none', textAlign: 'center', marginTop: 'auto' }}
          >
            {t('dashboard.viewInsights')}
          </Link>
        </div>

        {/* Quick Actions + Record CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Record CTA */}
          <Link to="/app/record" style={{ textDecoration: 'none' }}>
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
                {t('dashboard.recordSales')}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                {t('dashboard.recordSubtitle')}
              </p>
            </div>
          </Link>

          {/* Avg Daily Revenue */}
          <div className="glass-card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              {t('dashboard.avgDailyRevenue')}
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
            📄 {t('dashboard.downloadPDF')}
          </button>
        </div>
      </div>

      {/* AI Demand Forecast (from Python Prophet ML Service) */}
      {forecast && forecast.topPredictions?.length > 0 && (
        <div className="glass-card" style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 className="section-title">🎯 AI Demand Forecast — Tomorrow</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', marginTop: -8 }}>
            ML-powered predictions based on your sales history (Prophet model)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
            {forecast.topPredictions.slice(0, 6).map((pred, i) => (
              <div
                key={i}
                style={{
                  background: pred.trend === 'up'
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.06))'
                    : pred.trend === 'down'
                      ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.06))'
                      : 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(79,70,229,0.06))',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-md)',
                  border: '1px solid var(--border-subtle)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'default',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'capitalize' }}>
                    {pred.item}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontWeight: 600,
                    background: pred.trend === 'up' ? 'rgba(34,197,94,0.2)' : pred.trend === 'down' ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)',
                    color: pred.trend === 'up' ? '#16a34a' : pred.trend === 'down' ? '#dc2626' : '#6366f1',
                  }}>
                    {pred.trend === 'up' ? '📈 Trending Up' : pred.trend === 'down' ? '📉 Declining' : '➡️ Stable'}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>
                  {pred.predictedQty}
                  <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>units</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Confidence: {pred.confidence[0]}–{pred.confidence[1]} units
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {pred.method === 'prophet' ? '🤖 ML Model' : '📊 Average'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase 2 Feature 3: LLM Plain-Language Weekly Insights */}
      {weeklyPatterns?.plainInsights?.length > 0 && (
        <div className="glass-card" style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 className="section-title">{t('dashboard.weeklyObservations')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {weeklyPatterns.plainInsights.map((insight, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 'var(--space-sm)',
                  alignItems: 'flex-start',
                  padding: 'var(--space-sm) 0',
                  borderBottom: i < weeklyPatterns.plainInsights.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>
                  {['💡', '📊', '🎯'][i % 3]}
                </span>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {insight}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase 2 Feature 4: Next-Day Stock Suggestions */}
      {weeklyPatterns?.stockSuggestions?.length > 0 && (
        <div className="glass-card" style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 className="section-title">{t('dashboard.stockSuggestions')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {weeklyPatterns.stockSuggestions.map((sug, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--space-sm) 0',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'capitalize' }}>
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

      {/* Weekly Patterns */}
      {weeklyPatterns && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 className="section-title">{t('dashboard.weeklyPatterns')}</h2>
          <div className="grid grid-3">
            {/* Best Seller */}
            <div
              className="glass-card"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.05))',
                borderLeft: '3px solid var(--success-400)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                {t('dashboard.bestSeller')}
              </div>
              {weeklyPatterns.bestSeller ? (
                <>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      textTransform: 'capitalize',
                      marginBottom: 4,
                    }}
                  >
                    {weeklyPatterns.bestSeller.name}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {weeklyPatterns.bestSeller.totalQuantity} units sold · ₹{weeklyPatterns.bestSeller.totalRevenue.toLocaleString('en-IN')} revenue
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Appeared on {weeklyPatterns.bestSeller.daysAppeared} of 7 days
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('common.noDataYet')}</div>
              )}
            </div>

            {/* Peak Day */}
            <div
              className="glass-card"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))',
                borderLeft: '3px solid var(--text-accent)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                {t('dashboard.peakDay')}
              </div>
              {weeklyPatterns.peakDay ? (
                <>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    {weeklyPatterns.peakDay.dayName}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    ₹{weeklyPatterns.peakDay.revenue.toLocaleString('en-IN')} revenue · ₹{weeklyPatterns.peakDay.profit.toLocaleString('en-IN')} profit
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(weeklyPatterns.peakDay.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('common.noDataYet')}</div>
              )}
            </div>

            {/* Missed Profits */}
            <div
              className="glass-card"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))',
                borderLeft: '3px solid var(--danger-400)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                {t('dashboard.missedProfits')}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'var(--danger-400)',
                  marginBottom: 4,
                }}
              >
                ~₹{(weeklyPatterns.missedProfits?.totalLoss || 0).toLocaleString('en-IN')}
              </div>
              {weeklyPatterns.missedProfits?.topMissedItems?.length > 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Top: {weeklyPatterns.missedProfits.topMissedItems.slice(0, 2).map((m) => m.item).join(', ')}
                </div>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'var(--success-400)' }}>{t('dashboard.noMissedProfits')}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Insights */}
      {recentInsights.length > 0 && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              {t('dashboard.latestInsights')}
            </h2>
            <Link to="/app/insights" className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
              {t('common.viewAll')}
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {recentInsights.slice(0, 3).map((insight) => (
              <InsightCard key={insight._id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Micro-Loan Readiness (moved to bottom) */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          {t('dashboard.loanReadiness')}
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
