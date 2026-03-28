/**
 * StatCard — Reusable stat display component
 */

export default function StatCard({ icon, value, label, change, changeType = 'neutral', bgColor }) {
  const changeColors = {
    up: 'var(--success-400)',
    down: 'var(--danger-400)',
    neutral: 'var(--text-muted)',
  };

  return (
    <div className="stat-card">
      <div
        className="stat-icon"
        style={{
          background: bgColor || 'rgba(99, 102, 241, 0.15)',
        }}
      >
        {icon}
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {change && (
          <div
            className="stat-change"
            style={{ color: changeColors[changeType] }}
          >
            {changeType === 'up' ? '↑' : changeType === 'down' ? '↓' : ''} {change}
          </div>
        )}
      </div>
    </div>
  );
}
