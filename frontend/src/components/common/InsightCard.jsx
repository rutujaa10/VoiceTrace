/**
 * InsightCard — Display component for AI insights
 */

export default function InsightCard({ insight }) {
  const typeConfig = {
    prediction: { icon: '🌦️', color: 'rgba(59, 130, 246, 0.15)' },
    stock_advice: { icon: '📦', color: 'rgba(99, 102, 241, 0.15)' },
    missed_profit: { icon: '📉', color: 'rgba(239, 68, 68, 0.15)' },
    weekly_story: { icon: '📖', color: 'rgba(168, 85, 247, 0.15)' },
    csi: { icon: '🗺️', color: 'rgba(34, 197, 94, 0.15)' },
    weather_alert: { icon: '⛈️', color: 'rgba(245, 158, 11, 0.15)' },
    loan_milestone: { icon: '🎯', color: 'rgba(236, 72, 153, 0.15)' },
    daily_summary: { icon: '📒', color: 'rgba(99, 102, 241, 0.15)' },
  };

  const config = typeConfig[insight.type] || { icon: '💡', color: 'rgba(99, 102, 241, 0.15)' };

  const timeAgo = (date) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="insight-card">
      <div
        className="insight-icon"
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-md)',
          background: config.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {config.icon}
      </div>
      <div className="insight-body" style={{ flex: 1 }}>
        <h4>{insight.title}</h4>
        <p style={{ whiteSpace: 'pre-line' }}>
          {insight.content?.length > 200
            ? insight.content.slice(0, 200) + '...'
            : insight.content}
        </p>
        <div className="insight-time">{timeAgo(insight.createdAt)}</div>
      </div>
      {!insight.isRead && (
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--primary-400)',
            flexShrink: 0,
            marginTop: 6,
          }}
        />
      )}
    </div>
  );
}
