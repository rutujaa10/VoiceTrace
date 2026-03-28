/**
 * Insights View — AI-Powered Business Intelligence (Day-1 Ready)
 *
 * Features:
 *  - Weather Forecast Hero Card with animated backgrounds
 *  - Data Maturity Progress Bar
 *  - Smart AI Insights Feed (adapts to data volume)
 *  - Historical Insights from cron jobs
 *  - Weather-based stock advice
 *  - Business growth analysis
 */

import { useEffect, useState, useCallback } from 'react';
import { useApp } from '../state/AppContext';
import { insightAPI } from '../api';
import InsightCard from '../components/common/InsightCard';

const FILTER_TYPES = [
  { key: 'all', label: 'All', icon: '💡' },
  { key: 'prediction', label: 'Predictions', icon: '🌦️' },
  { key: 'csi', label: 'Area Intel', icon: '🗺️' },
  { key: 'weekly_story', label: 'Stories', icon: '📖' },
  { key: 'missed_profit', label: 'Missed $', icon: '📉' },
  { key: 'weather_alert', label: 'Weather', icon: '⛈️' },
];

/* ---- Weather animations CSS class map ---- */
const weatherBgClass = {
  clear: 'weather-sunny',
  clouds: 'weather-cloudy',
  rain: 'weather-rainy',
  drizzle: 'weather-rainy',
  thunderstorm: 'weather-storm',
  snow: 'weather-snowy',
  mist: 'weather-foggy',
  fog: 'weather-foggy',
  haze: 'weather-foggy',
};

const weatherEmoji = {
  clear: '☀️', clouds: '☁️', rain: '🌧️', drizzle: '🌦️',
  thunderstorm: '⛈️', snow: '❄️', mist: '🌫️', fog: '🌫️', haze: '🌫️',
};

export default function Insights() {
  const { state } = useApp();
  const [smartData, setSmartData] = useState(null);
  const [historicalInsights, setHistoricalInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [smartLoading, setSmartLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('smart'); // 'smart' | 'history'
  const [expandedCard, setExpandedCard] = useState(null);

  useEffect(() => {
    if (state.vendorId) {
      fetchSmartInsights();
      fetchHistoricalInsights();
    }
  }, [state.vendorId]);

  useEffect(() => {
    if (state.vendorId && activeTab === 'history') fetchHistoricalInsights();
  }, [activeFilter]);

  const fetchSmartInsights = async () => {
    setSmartLoading(true);
    setLoading(false); // Unblock page immediately — smart data loads in background
    try {
      const res = await insightAPI.getSmartInsights(state.vendorId);
      setSmartData(res.data.data);
    } catch (err) {
      console.error('Smart insights fetch error:', err);
    } finally {
      setSmartLoading(false);
    }
  };

  const fetchHistoricalInsights = async () => {
    try {
      const type = activeFilter === 'all' ? null : activeFilter;
      const res = await insightAPI.getAll(state.vendorId, type);
      setHistoricalInsights(res.data.data || []);
    } catch (err) {
      console.error('Historical insights fetch error:', err);
    }
  };

  const handleMarkRead = async (insightId) => {
    try {
      await insightAPI.markRead(insightId);
      setHistoricalInsights((prev) =>
        prev.map((i) => (i._id === insightId ? { ...i, isRead: true } : i))
      );
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const weather = smartData?.weather?.data;
  const forecast = weather?.forecast;
  const condition = forecast?.condition?.toLowerCase() || 'clear';

  return (
    <div className="stagger-children" id="insights-page">
      {/* ═══ Header ═══ */}
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>
          💡 <span className="gradient-text">AI Business Insights</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {smartData?.maturity === 'mature'
            ? 'Full AI intelligence active — personalized advice for your business'
            : 'AI-powered advice that gets smarter as you log more data'}
        </p>
      </div>

      {/* ═══ Weather Forecast Hero Card ═══ */}
      {smartLoading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-xl)' }} />
      ) : (
        <div
          className={`weather-hero-card ${weatherBgClass[condition] || 'weather-sunny'}`}
          id="weather-hero"
          style={{ marginBottom: 'var(--space-xl)' }}
        >
          {/* Animated weather particles */}
          <div className="weather-particles">
            {condition === 'rain' || condition === 'drizzle' ? (
              Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="rain-drop" style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${0.5 + Math.random() * 0.5}s`,
                }} />
              ))
            ) : condition === 'snow' ? (
              Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="snow-flake" style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  fontSize: `${8 + Math.random() * 8}px`,
                }}>❄</div>
              ))
            ) : condition === 'clear' ? (
              <div className="sun-glow" />
            ) : null}
          </div>

          <div className="weather-hero-content">
            <div className="weather-hero-left">
              <div className="weather-emoji">{weatherEmoji[condition] || '🌤️'}</div>
              <div>
                <div className="weather-temp">
                  {forecast?.temp || '--'}°C
                </div>
                <div className="weather-desc">
                  Tomorrow's Forecast
                </div>
                <div className="weather-details">
                  {forecast?.description ? (
                    <span style={{ textTransform: 'capitalize' }}>{forecast.description}</span>
                  ) : null}
                  {forecast?.humidity ? (
                    <span> · 💧 {forecast.humidity}%</span>
                  ) : null}
                  {forecast?.windSpeed ? (
                    <span> · 💨 {forecast.windSpeed} m/s</span>
                  ) : null}
                  {forecast?.rainProbability > 0 ? (
                    <span> · 🌧️ {Math.round(forecast.rainProbability * 100)}% rain</span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Weather business advice */}
            {smartData?.weather?.content && (
              <div className="weather-hero-advice">
                <div className="weather-advice-label">📋 Business Advice</div>
                <div className="weather-advice-text">{smartData.weather.content}</div>
                {smartData.weather.data?.advice?.length > 0 && (
                  <div className="weather-advice-tips">
                    {smartData.weather.data.advice.map((tip, i) => (
                      <div key={i} className="weather-tip-item">
                        <span className="weather-tip-bullet">→</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Current weather badge */}
          {weather?.current && (
            <div className="weather-current-badge">
              Now: {weather.current.temp}°C · {weather.current.condition}
            </div>
          )}
        </div>
      )}

      {/* ═══ Data Maturity Progress Bar ═══ */}
      {smartData && smartData.maturity !== 'mature' && (
        <div className="glass-card maturity-card" id="maturity-progress" style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span style={{ fontSize: '1.2rem' }}>
                {smartData.maturity === 'day0' ? '🌱' : smartData.maturity === 'early' ? '📊' : '🚀'}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>
                {smartData.maturityProgress.label}
              </span>
            </div>
            <span className="badge badge-info">
              {smartData.entryCount} / {smartData.maturityProgress.nextMilestone} days
            </span>
          </div>

          {/* Progress bar */}
          <div className="maturity-progress-track">
            <div
              className="maturity-progress-fill"
              style={{
                width: `${Math.min((smartData.entryCount / smartData.maturityProgress.nextMilestone) * 100, 100)}%`
              }}
            />
          </div>

          {/* Milestone markers */}
          <div className="maturity-milestones">
            <MaturityMilestone day={0} label="Start" current={smartData.entryCount} icon="🌱" />
            <MaturityMilestone day={1} label="First Log" current={smartData.entryCount} icon="📝" />
            <MaturityMilestone day={4} label="Trends" current={smartData.entryCount} icon="📈" />
            <MaturityMilestone day={8} label="Full AI" current={smartData.entryCount} icon="🧠" />
          </div>
        </div>
      )}

      {/* ═══ Tab Switcher ═══ */}
      <div className="insights-tab-bar" style={{ marginBottom: 'var(--space-lg)' }}>
        <button
          className={`insights-tab ${activeTab === 'smart' ? 'active' : ''}`}
          onClick={() => setActiveTab('smart')}
          id="tab-smart-insights"
        >
          🧠 Smart Insights
          {smartData?.insights?.length > 0 && (
            <span className="insights-tab-count">{smartData.insights.length}</span>
          )}
        </button>
        <button
          className={`insights-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          id="tab-history-insights"
        >
          📜 History
          {historicalInsights.length > 0 && (
            <span className="insights-tab-count">{historicalInsights.length}</span>
          )}
        </button>
      </div>

      {/* ═══ Smart Insights Feed ═══ */}
      {activeTab === 'smart' && (
        <div className="smart-insights-feed">
          {smartLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : smartData?.insights?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {smartData.insights
                .filter(ins => ins.type !== 'weather_forecast') // weather shown in hero
                .map((insight, idx) => (
                  <SmartInsightCard
                    key={`${insight.type}-${idx}`}
                    insight={insight}
                    isExpanded={expandedCard === idx}
                    onToggle={() => setExpandedCard(expandedCard === idx ? null : idx)}
                  />
                ))}
            </div>
          ) : (
            <div className="empty-state glass-card">
              <div className="empty-icon">💡</div>
              <h3>Loading Intelligence...</h3>
              <p>Smart insights are being generated. Check back shortly!</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ Historical Insights Feed ═══ */}
      {activeTab === 'history' && (
        <div>
          {/* Filter Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-xs)',
              marginBottom: 'var(--space-lg)',
              overflowX: 'auto',
              paddingBottom: 'var(--space-xs)',
            }}
          >
            {FILTER_TYPES.map((filter) => (
              <button
                key={filter.key}
                className={`btn ${activeFilter === filter.key ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '6px 14px', whiteSpace: 'nowrap' }}
                onClick={() => setActiveFilter(filter.key)}
                id={`filter-${filter.key}`}
              >
                {filter.icon} {filter.label}
              </button>
            ))}
          </div>

          {/* Insights Feed */}
          {historicalInsights.length === 0 ? (
            <div className="empty-state glass-card">
              <div className="empty-icon">📜</div>
              <h3>No Historical Insights Yet</h3>
              <p>Daily predictions and weekly stories will appear here as you log more data!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {historicalInsights.map((insight) => (
                <div
                  key={insight._id}
                  onClick={() => !insight.isRead && handleMarkRead(insight._id)}
                  style={{ cursor: !insight.isRead ? 'pointer' : 'default' }}
                >
                  <InsightCard insight={insight} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Smart Insight Card — Premium interactive card component
   ──────────────────────────────────────────────────────────── */
function SmartInsightCard({ insight, isExpanded, onToggle }) {
  const typeStyles = {
    getting_started: { bg: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08))', accent: '#818cf8' },
    business_tip: { bg: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.08))', accent: '#22c55e' },
    seasonal_tip: { bg: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,88,12,0.08))', accent: '#f59e0b' },
    revenue_analysis: { bg: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.08))', accent: '#10b981' },
    top_items: { bg: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(139,92,246,0.08))', accent: '#a855f7' },
    expense_health: { bg: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(37,99,235,0.08))', accent: '#3b82f6' },
    unlock_preview: { bg: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1))', accent: '#818cf8' },
    revenue_trend: { bg: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.08))', accent: '#22c55e' },
    best_day: { bg: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,88,12,0.08))', accent: '#f59e0b' },
    missed_profit_recovery: { bg: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.08))', accent: '#ef4444' },
    wow_comparison: { bg: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))', accent: '#6366f1' },
    profit_optimization: { bg: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(6,182,212,0.08))', accent: '#14b8a6' },
    growth_score: { bg: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(168,85,247,0.1))', accent: '#f59e0b' },
    ai_growth_tips: { bg: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1))', accent: '#818cf8' },
    consistency: { bg: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(245,158,11,0.1))', accent: '#f97316' },
  };

  const style = typeStyles[insight.type] || { bg: 'rgba(99,102,241,0.1)', accent: '#818cf8' };

  return (
    <div
      className={`smart-insight-card ${isExpanded ? 'expanded' : ''}`}
      onClick={onToggle}
      style={{
        background: style.bg,
        borderLeft: `3px solid ${style.accent}`,
        cursor: 'pointer',
      }}
    >
      <div className="smart-insight-header">
        <div className="smart-insight-icon">{insight.icon}</div>
        <div className="smart-insight-title-area">
          <h4 className="smart-insight-title">{insight.title}</h4>
          <span className="smart-insight-subtitle">{insight.subtitle}</span>
        </div>
        <div className={`smart-insight-chevron ${isExpanded ? 'rotated' : ''}`}>▾</div>
      </div>

      <div className={`smart-insight-body ${isExpanded ? 'visible' : ''}`}>
        <p className="smart-insight-content">{insight.content}</p>

        {/* Render data-specific visualizations */}
        {isExpanded && insight.data && (
          <div className="smart-insight-data">
            {/* Growth score gauge */}
            {insight.type === 'growth_score' && insight.data.factors && (
              <div className="growth-factors">
                <GrowthFactor label="Consistency" value={insight.data.factors.consistency} icon="📅" />
                <GrowthFactor label="Profit Margin" value={insight.data.factors.profitMargin} icon="💰" />
                <GrowthFactor label="Items" value={Math.min(insight.data.factors.diversification * 10, 100)} icon="📦" />
                <GrowthFactor label="Streak" value={Math.min(insight.data.factors.streak * 3.3, 100)} icon="🔥" />
              </div>
            )}

            {/* Top items list */}
            {insight.type === 'top_items' && insight.data.topItems && (
              <div className="top-items-list">
                {insight.data.topItems.map((item, i) => (
                  <div key={i} className="top-item-row">
                    <span className="top-item-rank">#{i + 1}</span>
                    <span className="top-item-name">{item.name}</span>
                    <span className="top-item-value">₹{item.revenue?.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Missed items */}
            {insight.type === 'missed_profit_recovery' && insight.data.topMissedItems && (
              <div className="missed-items-list">
                {insight.data.topMissedItems.map((item, i) => (
                  <div key={i} className="missed-item-row">
                    <span>📦 {item.name}</span>
                    <span className="missed-item-loss">-₹{Math.round(item.loss).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Stock adjustments from weather */}
            {insight.data.stockAdjustments?.length > 0 && (
              <div className="stock-adjustments">
                <div className="stock-adj-label">📦 Stock Adjustments:</div>
                {insight.data.stockAdjustments.map((adj, i) => (
                  <div key={i} className="stock-adj-row">
                    <span className={`stock-adj-badge ${adj.action === 'increase' ? 'increase' : 'decrease'}`}>
                      {adj.action === 'increase' ? '↑' : '↓'} {adj.percentage}%
                    </span>
                    <span>{adj.items?.join(', ')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* AI Growth tips */}
            {insight.type === 'ai_growth_tips' && insight.data.tips && (
              <div className="ai-tips-list">
                {insight.data.tips.map((tip, i) => (
                  <div key={i} className="ai-tip-row">
                    <span className="ai-tip-number">{i + 1}</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Maturity unlock preview */}
            {insight.type === 'unlock_preview' && insight.data.targetDays && (
              <div className="unlock-progress-mini">
                <div className="unlock-progress-track-mini">
                  <div
                    className="unlock-progress-fill-mini"
                    style={{ width: `${(insight.data.currentDays / insight.data.targetDays) * 100}%` }}
                  />
                </div>
                <span className="unlock-progress-label">
                  {insight.data.currentDays} / {insight.data.targetDays} days
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Growth Factor Mini Bar
   ──────────────────────────────────────────────────────────── */
function GrowthFactor({ label, value, icon }) {
  const clampedValue = Math.min(Math.max(value || 0, 0), 100);
  return (
    <div className="growth-factor">
      <div className="growth-factor-header">
        <span>{icon} {label}</span>
        <span className="growth-factor-value">{Math.round(clampedValue)}%</span>
      </div>
      <div className="growth-factor-track">
        <div
          className="growth-factor-fill"
          style={{
            width: `${clampedValue}%`,
            background: clampedValue > 60 ? 'var(--gradient-success)' : clampedValue > 30 ? 'var(--gradient-accent)' : 'var(--gradient-primary)',
          }}
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Maturity Milestone Marker
   ──────────────────────────────────────────────────────────── */
function MaturityMilestone({ day, label, current, icon }) {
  const isAchieved = current >= day;
  return (
    <div className={`maturity-milestone ${isAchieved ? 'achieved' : ''}`}>
      <div className="milestone-icon">{isAchieved ? '✅' : icon}</div>
      <div className="milestone-label">{label}</div>
    </div>
  );
}
