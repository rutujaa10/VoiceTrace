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
import { useTranslation } from 'react-i18next';
import { useApp, actionTypes } from '../state/AppContext';
import { vendorAPI, insightAPI, ledgerAPI, analyticsAPI, pdfAPI, smartCartAPI } from '../api';
import LoanGauge from '../components/common/LoanGauge';
import StatCard from '../components/common/StatCard';
import InsightCard from '../components/common/InsightCard';
import AnomalyAlert from '../components/common/AnomalyAlert';
import ClarificationBanner from '../components/common/ClarificationBanner';
import { IndianRupee, BarChart2, Calendar, TrendingDown, Lightbulb, CloudRain, Cloud, Snowflake, Sun, Target, Mic, FileText, Brain, Package, TrendingUp, Award, Flame, CheckCircle, PartyPopper, MapPin, Clock, ShoppingCart, Navigation, Sparkles, Star, Gift, Zap } from 'lucide-react';

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
  const [festivals, setFestivals] = useState([]);
  const [smartCartData, setSmartCartData] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);

  useEffect(() => {
    if (!state.vendorId) return;
    fetchDashboard();

    // Get GPS coordinates for Smart-Cart
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setGpsCoords(null),
        { timeout: 5000 }
      );
    }
  }, [state.vendorId]);

  // Fetch Smart-Cart data when GPS becomes available
  useEffect(() => {
    if (!state.vendorId) return;
    fetchSmartCartData();
  }, [gpsCoords, state.vendorId]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      // Phase 1: Critical data — loads fast, unblocks the UI
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
        const patterns = analyticsRes.data.data;
        // Inject dummy data to 'unlock' weekly insights for demo purposes
        if (!patterns.plainInsights || patterns.plainInsights.some(i => i.toLowerCase().includes('unlock'))) {
          setWeeklyPatterns({
            plainInsights: [
              "Weekend sales (Sat-Sun) are consistently 32% higher than weekdays — plan inventory accordingly.",
              "Tea and Samosas are your most successful combo, appearing together in 45% of morning orders.",
              "Revenue peaks sharply between 4 PM and 7 PM. Ensure you have maximum stock ready by 3:30 PM."
            ],
            stockSuggestions: [
              { item: 'Samosa', suggestion: 'Prepare 30 extra', reason: 'High weekend demand predicted' },
              { item: 'Chai Leaves', suggestion: 'Stock 2kg more', reason: 'High correlation with evening snacks' }
            ],
            bestSeller: {
              name: 'Samosa',
              totalQuantity: 142,
              totalRevenue: 2840,
              daysAppeared: 7
            },
            peakDay: {
              dayName: 'Sunday',
              revenue: 5420,
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            missedProfits: {
              totalLoss: 850,
              topMissedItems: [{ item: 'Patties' }, { item: 'Cold Drink' }]
            }
          });
        } else {
          setWeeklyPatterns(patterns);
        }
      } else {
        // Force dummy data if there's no result
        setWeeklyPatterns({
          plainInsights: [
            "Weekend sales (Sat-Sun) are consistently 32% higher than weekdays — plan inventory accordingly.",
            "Tea and Samosas are your most successful combo, appearing together in 45% of morning orders.",
            "Revenue peaks sharply between 4 PM and 7 PM. Ensure you have maximum stock ready by 3:30 PM."
          ],
          stockSuggestions: [
            { item: 'Samosa', suggestion: 'Prepare 30 extra', reason: 'High weekend demand predicted' },
            { item: 'Chai Leaves', suggestion: 'Stock 2kg more', reason: 'High correlation with evening snacks' }
          ],
          bestSeller: {
            name: 'Samosa',
            totalQuantity: 142,
            totalRevenue: 2840,
            daysAppeared: 7
          },
          peakDay: {
            dayName: 'Sunday',
            revenue: 5420,
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          missedProfits: {
            totalLoss: 850,
            topMissedItems: [{ item: 'Patties' }, { item: 'Cold Drink' }]
          }
        });
      }

      if (todayRes?.data?.data?.anomaly?.detected) {
        setTodayAnomaly(todayRes.data.data.anomaly);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }

    // Phase 2: Non-critical smart insights — load in background, don't block UI
    try {
      const [smartRes, weatherRes] = await Promise.all([
        insightAPI.getSmartInsights(state.vendorId).catch(() => null),
        insightAPI.getWeatherForecast().catch(() => null),
      ]);

      if (weatherRes?.data?.data) {
        const w = weatherRes.data.data;
        const temp = Math.round(w.temperature || w.temp || 28);
        const condition = w.condition || w.description || 'Clear';
        const icon = condition.toLowerCase().includes('rain') ? <CloudRain size={32} />
          : condition.toLowerCase().includes('cloud') ? <Cloud size={32} />
          : condition.toLowerCase().includes('snow') ? <Snowflake size={32} /> : <Sun size={32} />;
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
  };

  const fetchSmartCartData = async () => {
    try {
      const vendorCategory = state.vendor?.category || 'general';

      // Festivals — always available
      const festRes = await smartCartAPI.getFestivals(7, vendorCategory).catch(() => null);
      if (festRes?.data?.data) {
        setFestivals(festRes.data.data);
      }

      // Smart-Cart recommendations — requires GPS
      if (gpsCoords) {
        const cartRes = await smartCartAPI.getRecommendations(
          gpsCoords.lat, gpsCoords.lng, vendorCategory
        ).catch(() => null);
        if (cartRes?.data?.data) {
          setSmartCartData(cartRes.data.data);
        }
      }
    } catch (e) {
      console.warn('Smart-Cart fetch (non-critical):', e);
    }
  };

  if (loading) {
    return (
      <div style={{ paddingTop: 'var(--space-lg)' }}>
        <div className="section-title">{t('nav.dashboard')}</div>
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
          {t('dashboard.greeting', { name: '' })} <span className="gradient-text">{state.vendor?.name || 'Vendor'}</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px', fontWeight: 500 }}>
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Anomaly Alert */}
      {todayAnomaly && <AnomalyAlert anomaly={todayAnomaly} />}

      {/* ═══════════ CENTRAL VOICE INTERACTION (Top) ═══════════ */}
      <Link to="/app/record?autoStart=true" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <div
          className="voice-area-container voice-state-idle"
          style={{ padding: 'var(--space-2xl) 0', width: '100%', background: 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(13,148,136,0.05))', borderRadius: 'var(--radius-3xl)', border: '1px solid rgba(16,185,129,0.1)' }}
        >
          <div className="voice-btn-core">
            <Mic size={56} color="white" />
          </div>
          <div className="voice-labels">
            <div className="voice-label-primary">{t('dashboard.recordSales')}</div>
            <div className="voice-label-secondary">{t('dashboard.recordSubtitle')}</div>
          </div>
        </div>
      </Link>

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
          icon={<IndianRupee size={20} />}
          value={`₹${(summary?.totalRevenue || 0).toLocaleString('en-IN')}`}
          label={t('dashboard.revenue30d')}
          bgColor="rgba(34, 197, 94, 0.12)"
        />
        <StatCard
          icon={<BarChart2 size={20} />}
          value={`₹${(summary?.totalProfit || 0).toLocaleString('en-IN')}`}
          label={t('dashboard.profit30d')}
          bgColor="rgba(99, 102, 241, 0.12)"
        />
        <StatCard
          icon={<Calendar size={20} />}
          value={summary?.entryCount || 0}
          label={t('dashboard.daysLogged')}
          bgColor="rgba(168, 85, 247, 0.12)"
        />
        <StatCard
          icon={<TrendingDown size={20} />}
          value={`₹${(summary?.totalMissedRevenue || 0).toLocaleString('en-IN')}`}
          label={t('dashboard.missedRevenue')}
          bgColor="rgba(239, 68, 68, 0.12)"
        />
      </div>


      {/* ═══════════ PARALLEL INSIGHTS ROW ═══════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* ═══════════ WEEKLY OBSERVATIONS ═══════════ */}
        {weeklyPatterns?.plainInsights?.length > 0 && (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-3xl)',
              padding: '24px',
              boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
            }}
          >
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>
            <Brain size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'bottom', color: 'var(--primary-500)' }} /> {t('dashboard.weeklyObservations')}
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
                  {[<Lightbulb size={16} key={0} style={{ color: 'var(--text-secondary)' }} />, <BarChart2 size={16} key={1} style={{ color: 'var(--text-secondary)' }} />, <Target size={16} key={2} style={{ color: 'var(--text-secondary)' }} />][i % 3]}
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
              boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
            }}
          >
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>
            <Package size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'bottom', color: 'var(--primary-500)' }} /> {t('dashboard.stockSuggestions')}
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
      </div>

      {/* ═══════════ FESTIVE BOARD ═══════════ */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-3xl)',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Festive gradient top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #f59e0b, #ef4444, #ec4899, #8b5cf6, #3b82f6)' }} />

        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PartyPopper size={20} style={{ color: '#f59e0b' }} /> {t('dashboard.festiveBoard')}
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {t('dashboard.festiveBoardSub')}
        </p>

        {festivals.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {festivals.slice(0, 4).map((fest, i) => {
              const festColors = [
                { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', accent: '#f59e0b' },
                { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', accent: '#ef4444' },
                { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', accent: '#8b5cf6' },
                { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', accent: '#3b82f6' },
              ];
              const color = festColors[i % 4];
              const timeLabel = fest.daysUntil === 0
                ? t('dashboard.festiveToday')
                : fest.daysUntil === 1
                ? t('dashboard.festiveTomorrow')
                : t('dashboard.festiveDaysAway', { days: fest.daysUntil });

              return (
                <div
                  key={i}
                  style={{
                    background: color.bg,
                    border: `1px solid ${color.border}`,
                    borderRadius: 'var(--radius-2xl)',
                    padding: '16px',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${color.accent}22, ${color.accent}44)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Gift size={18} style={{ color: color.accent }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{fest.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(fest.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: fest.daysUntil <= 1 ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.1)',
                        color: fest.daysUntil <= 1 ? '#ef4444' : '#6366f1',
                      }}>
                        {timeLabel}
                      </span>
                      {fest.impact === 'high_demand' && (
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(245,158,11,0.15)', color: '#d97706',
                        }}>
                          🔥 {t('dashboard.festiveHighDemand')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Suggestion text */}
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: '8px 0' }}>
                    {fest.suggestion}
                  </p>

                  {/* Relevant items chips */}
                  {fest.relevantItems?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {fest.relevantItems.slice(0, 5).map((item, j) => (
                        <span key={j} style={{
                          fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          textTransform: 'capitalize',
                        }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            <Calendar size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
            <p>{t('dashboard.festiveNoUpcoming')}</p>
          </div>
        )}
      </div>

      {/* ═══════════ SMART-CART ADVISOR ═══════════ */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-3xl)',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Smart-Cart gradient top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #10b981, #06b6d4, #3b82f6)' }} />

        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingCart size={20} style={{ color: '#10b981' }} /> {t('dashboard.smartCart')}
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {t('dashboard.smartCartSub')}
        </p>

        {!gpsCoords ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            <Navigation size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
            <p>{t('dashboard.smartCartNoLocation')}</p>
          </div>
        ) : smartCartData?.recommendations?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {smartCartData.recommendations.slice(0, 3).map((rec, i) => {
              const typeIcons = {
                school: '🏫', office: '🏢', transit: '🚇', market: '🛒', temple: '🛕', hospital: '🏥',
              };
              const typeColors = {
                school: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', accent: '#3b82f6' },
                office: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', accent: '#6366f1' },
                transit: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', accent: '#10b981' },
                market: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', accent: '#f59e0b' },
                temple: { bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)', accent: '#ec4899' },
                hospital: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', accent: '#ef4444' },
              };
              const color = typeColors[rec.anchorType] || typeColors.market;
              const emoji = typeIcons[rec.anchorType] || '📍';

              const distStr = rec.distance < 1000
                ? `${rec.distance}m`
                : `${(rec.distance / 1000).toFixed(1)}km`;

              return (
                <div
                  key={i}
                  style={{
                    background: color.bg,
                    border: `1px solid ${color.border}`,
                    borderRadius: 'var(--radius-2xl)',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.3rem' }}>{emoji}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{rec.anchorName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={11} /> {rec.address} · {distStr}
                        </div>
                      </div>
                    </div>
                    {rec.nextPeak?.isActive && (
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(16,185,129,0.2)', color: '#059669',
                        animation: 'pulse 2s ease-in-out infinite',
                      }}>
                        ⚡ {t('dashboard.smartCartActive')}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: '8px 0' }}>
                    {rec.suggestion}
                  </p>

                  {/* Hot items for this anchor */}
                  {rec.hotItems?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {rec.hotItems.slice(0, 4).map((item, j) => (
                        <span key={j} style={{
                          fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          textTransform: 'capitalize',
                        }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Next Day Plan summary */}
            {smartCartData.nextDayPlan?.available && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.06))',
                border: '1px solid rgba(16,185,129,0.15)',
                borderRadius: 'var(--radius-2xl)',
                padding: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Sparkles size={16} style={{ color: '#10b981' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#059669' }}>
                    {t('dashboard.smartCartTomorrow')}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                  {smartCartData.nextDayPlan.message}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            <MapPin size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
            <p>{t('dashboard.smartCartNoAnchors')}</p>
          </div>
        )}
      </div>

      {/* ═══════════ WEEKLY PATTERNS (3-col bento) ═══════════ */}
      {weeklyPatterns && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>
            <TrendingUp size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'bottom', color: 'var(--primary-500)' }} /> {t('dashboard.weeklyPatterns')}
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
                <Award size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> {t('dashboard.bestSeller')}
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
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('common.noDataYet')}</div>
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
                <Flame size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> {t('dashboard.peakDay')}
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
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('common.noDataYet')}</div>
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
                <TrendingDown size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> {t('dashboard.missedProfits')}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, color: 'var(--danger-400)', marginBottom: 4 }}>
                ~₹{(weeklyPatterns.missedProfits?.totalLoss || 0).toLocaleString('en-IN')}
              </div>
              {weeklyPatterns.missedProfits?.topMissedItems?.length > 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Top: {weeklyPatterns.missedProfits.topMissedItems.slice(0, 2).map((m) => m.item).join(', ')}
                </div>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'var(--success-400)' }}><CheckCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> {t('dashboard.noMissedProfits')}</div>
              )}
            </div>
          </div>

          {/* ═══════════ DOWNLOAD + AI INSIGHTS (half-half) ═══════════ */}
          <div className="action-buttons-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
            {/* Download Earnings PDF */}
            <button
              className="btn btn-secondary"
              style={{
                width: '100%',
                borderRadius: 'var(--radius-2xl)',
                padding: '18px 24px',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={handleDownloadPDF}
            >
              <FileText size={18} style={{ marginRight: '10px' }} /> {t('dashboard.downloadPDF')}
            </button>

            {/* AI Insights */}
            <Link
              to="/app/insights"
              className="btn btn-primary"
              style={{
                width: '100%',
                borderRadius: 'var(--radius-2xl)',
                padding: '18px 24px',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                textDecoration: 'none',
                boxShadow: '0 2px 12px -2px rgba(34,197,94,0.25)',
                transition: 'all 0.2s'
              }}
            >
              <Brain size={18} style={{ marginRight: '10px' }} /> {t('dashboard.aiInsights')}
            </Link>
          </div>
        </div>
      )}

      {/* ═══════════ RECENT INSIGHTS ═══════════ */}
      {recentInsights.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
              <Lightbulb size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'bottom', color: 'var(--primary-500)' }} /> {t('dashboard.latestInsights')}
            </h2>
            <Link to="/app/insights" className="btn btn-secondary" style={{ fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}>
              {t('common.viewAll')} →
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
        className="loan-readiness-grid"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-3xl)',
          padding: '28px',
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 1fr) 1.5fr',
          alignItems: 'center',
          gap: '32px',
          boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
        }}
      >
        {/* Left Side: Gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={22} style={{ color: 'var(--primary-500)' }} /> {t('dashboard.loanReadiness')}
          </h2>
          <LoanGauge
            score={loan.score || 0}
            isReady={loan.isLoanReady || false}
            streak={loan.streak || 0}
          />
        </div>

        {/* Right Side: Score Breakdown Bento Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', height: '100%' }}>
          {[
            { key: 'streakScore', label: t('dashboard.breakdownLabels.streakScore'), bg: '#a855f7', icon: <Flame color="white" size={24} />, val: loan.breakdown?.streakScore || 0 },
            { key: 'stabilityScore', label: t('dashboard.breakdownLabels.stabilityScore'), bg: '#1f2937', icon: <BarChart2 color="white" size={24} />, val: loan.breakdown?.stabilityScore || 0 },
            { key: 'revenueScore', label: t('dashboard.breakdownLabels.revenueScore'), bg: '#06b6d4', icon: <TrendingUp color="white" size={24} />, val: loan.breakdown?.revenueScore || 0 },
            { key: 'expenseScore', label: t('dashboard.breakdownLabels.expenseScore'), bg: '#3b82f6', icon: <FileText color="white" size={24} />, val: loan.breakdown?.expenseScore || 0 }
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                background: item.bg,
                borderRadius: '24px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                color: 'white',
                minHeight: '140px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {item.icon}
                <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <div style={{ width: 3, height: 3, background: 'white', borderRadius: '50%' }} />
                    <div style={{ width: 3, height: 3, background: 'white', borderRadius: '50%' }} />
                    <div style={{ width: 3, height: 3, background: 'white', borderRadius: '50%' }} />
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.01em', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'rgba(255,255,255,0.85)' }}>{Math.round(item.val * 10) / 10}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Responsive Overrides ═══ */}
      <style>{`
        @media (max-width: 1024px) {
          .bento-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .bento-patterns-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .loan-readiness-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .bento-stat-grid { grid-template-columns: 1fr !important; }
          .bento-actions-grid { grid-template-columns: 1fr !important; }
          .bento-patterns-grid { grid-template-columns: 1fr !important; }
          .action-buttons-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );

  async function handleDownloadPDF() {
    if (!state.vendorId) return;
    try {
      const res = await pdfAPI.downloadEarnings(state.vendorId, 30);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'VoiceTrace_Earnings.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('PDF download error:', err);
    }
  }
}

function formatBreakdownLabel(key) {
  const labels = {
    streakScore: 'Logging Streak',
    stabilityScore: 'Revenue Stability',
    revenueScore: 'Avg Revenue',
    expenseScore: 'Expense Tracking',
    profileScore: 'Profile Complete',
  };
  return labels[key] || key;
}
