/**
 * AnomalyAlert — Phase 4 Feature 7
 *
 * Displays a single-line gentle alert when today's earnings/expenses
 * are significantly outside the usual range.
 *
 * Usage:
 *   <AnomalyAlert anomaly={entry.anomaly} />
 */

export default function AnomalyAlert({ anomaly }) {
  if (!anomaly || !anomaly.detected) return null;

  const bgColors = {
    info: 'rgba(34, 197, 94, 0.12)',
    warning: 'rgba(245, 158, 11, 0.12)',
    alert: 'rgba(239, 68, 68, 0.12)',
  };

  const borderColors = {
    info: 'rgba(34, 197, 94, 0.3)',
    warning: 'rgba(245, 158, 11, 0.3)',
    alert: 'rgba(239, 68, 68, 0.3)',
  };

  const icons = {
    info: '📈',
    warning: '⚠️',
    alert: '🚨',
    revenue_high: '📈',
    revenue_low: '📉',
    expense_high: '💸',
    expense_low: '💰',
  };

  const icon = icons[anomaly.type] || icons[anomaly.severity] || '📊';

  return (
    <div
      className="animate-fadeInUp"
      style={{
        padding: 'var(--space-md) var(--space-lg)',
        background: bgColors[anomaly.severity] || bgColors.info,
        border: `1px solid ${borderColors[anomaly.severity] || borderColors.info}`,
        borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--space-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
      }}
    >
      <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
        {anomaly.message}
      </span>
    </div>
  );
}
