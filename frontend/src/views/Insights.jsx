/**
 * Insights View — AI-generated insights feed
 *
 * Shows: predictions, CSI, weekly stories, weather alerts, missed profits
 */

import { useEffect, useState } from 'react';
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

export default function Insights() {
  const { state } = useApp();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [weeklyStory, setWeeklyStory] = useState(null);

  useEffect(() => {
    if (state.vendorId) fetchInsights();
  }, [state.vendorId, activeFilter]);

  useEffect(() => {
    if (state.vendorId) fetchWeeklyStory();
  }, [state.vendorId]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const type = activeFilter === 'all' ? null : activeFilter;
      const res = await insightAPI.getAll(state.vendorId, type);
      setInsights(res.data.data || []);
    } catch (err) {
      console.error('Insights fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyStory = async () => {
    try {
      const res = await insightAPI.getWeeklyStory(state.vendorId);
      setWeeklyStory(res.data.data);
    } catch (err) {
      // No story available
    }
  };

  const handleMarkRead = async (insightId) => {
    try {
      await insightAPI.markRead(insightId);
      setInsights((prev) =>
        prev.map((i) => (i._id === insightId ? { ...i, isRead: true } : i))
      );
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  return (
    <div className="stagger-children">
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>
          💡 <span className="gradient-text">Business Insights</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          AI-powered advice to grow your business
        </p>
      </div>

      {/* Weekly Story Card */}
      {weeklyStory && (
        <div
          className="glass-card animate-fadeInUp"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(99,102,241,0.12))',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <span style={{ fontSize: '1.5rem' }}>📖</span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>
              {weeklyStory.title || 'Your Weekly Story'}
            </h3>
          </div>
          <div
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              whiteSpace: 'pre-line',
            }}
          >
            {weeklyStory.content}
          </div>
        </div>
      )}

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
          >
            {filter.icon} {filter.label}
          </button>
        ))}
      </div>

      {/* Insights Feed */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-icon">💡</div>
          <h3>No Insights Yet</h3>
          <p>Keep logging your sales and insights will appear here!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {insights.map((insight) => (
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
  );
}
