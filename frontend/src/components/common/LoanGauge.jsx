/**
 * LoanGauge — Animated SVG gauge for Micro-Loan Readiness Meter
 */

export default function LoanGauge({ score = 0, isReady = false, streak = 0 }) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  // Color based on score
  const getColor = () => {
    if (score >= 75) return 'url(#gauge-gradient-success)';
    if (score >= 50) return 'url(#gauge-gradient-warning)';
    return 'url(#gauge-gradient-danger)';
  };

  return (
    <div className="gauge-container" style={{ position: 'relative' }}>
      <div style={{ position: 'relative', width: 200, height: 200 }}>
        <svg className="gauge-svg" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="gauge-gradient-success" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="gauge-gradient-warning" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="gauge-gradient-danger" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <circle
            className="gauge-bg"
            cx="100"
            cy="100"
            r={radius}
          />
          <circle
            className="gauge-fill"
            cx="100"
            cy="100"
            r={radius}
            stroke={getColor()}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ animation: 'gauge-fill 1.5s ease forwards' }}
          />
        </svg>

        {/* Center content */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            className="gauge-score gradient-text"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              fontWeight: 800,
            }}
          >
            {score}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginTop: -4,
            }}
          >
            out of 100
          </span>
        </div>
      </div>

      {/* Status */}
      <div style={{ textAlign: 'center' }}>
        <div
          className={`badge ${isReady ? 'badge-success' : 'badge-warning'}`}
          style={{ fontSize: '0.85rem', padding: '6px 16px' }}
        >
          {isReady ? '✅ PM SVANidhi Ready!' : '🔄 Keep Logging Daily'}
        </div>
        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            marginTop: 'var(--space-sm)',
          }}
        >
          🔥 {streak} day streak
        </p>
      </div>
    </div>
  );
}
