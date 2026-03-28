/**
 * StatCard — Modern Bento-style stat display
 *
 * Features:
 * - Rounded-3xl corners with gradient accent strip
 * - Soft diffuse shadow, no harsh borders
 * - Smooth hover lift animation
 * - Plus Jakarta Sans typography
 */

export default function StatCard({ icon, value, label, change, changeType = 'neutral', bgColor }) {
  const changeColors = {
    up: 'var(--success-400)',
    down: 'var(--danger-400)',
    neutral: 'var(--text-muted)',
  };

  // Extract a gradient strip color from bgColor
  const stripColor = bgColor || 'rgba(99, 102, 241, 0.3)';

  return (
    <div
      className="stat-card-v2"
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-3xl)',
        padding: '20px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 2px 12px -2px rgba(0,0,0,0.06)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 40px -8px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px -2px rgba(0,0,0,0.06)';
      }}
    >
      {/* Gradient accent strip (left edge) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: '20%',
          bottom: '20%',
          width: '3px',
          borderRadius: '0 4px 4px 0',
          background: stripColor.replace('0.15', '0.8'),
        }}
      />

      {/* Icon circle */}
      <div
        style={{
          width: '46px',
          height: '46px',
          borderRadius: '14px',
          background: bgColor || 'rgba(99, 102, 241, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.3rem',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.6rem',
            fontWeight: 800,
            lineHeight: 1.2,
            color: 'var(--text-primary)',
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            marginTop: '2px',
            fontWeight: 500,
          }}
        >
          {label}
        </div>
        {change && (
          <div
            style={{
              fontSize: '0.73rem',
              fontWeight: 700,
              marginTop: '4px',
              color: changeColors[changeType],
            }}
          >
            {changeType === 'up' ? '↑' : changeType === 'down' ? '↓' : ''} {change}
          </div>
        )}
      </div>
    </div>
  );
}
