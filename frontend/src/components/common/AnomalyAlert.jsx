/**
 * AnomalyAlert — Phase 4 Feature 7
 *
 * Displays a single-line gentle alert when today's earnings/expenses
 * are significantly outside the usual range.
 *
 * Usage:
 *   <AnomalyAlert anomaly={entry.anomaly} />
 */

import { TrendingUp, TrendingDown, AlertTriangle, AlertCircle, CreditCard, BarChart3 } from 'lucide-react';

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

  const iconMap = {
    info: TrendingUp,
    warning: AlertTriangle,
    alert: AlertCircle,
    revenue_high: TrendingUp,
    revenue_low: TrendingDown,
    expense_high: CreditCard,
    expense_low: BarChart3,
  };

  const IconComponent = iconMap[anomaly.type] || iconMap[anomaly.severity] || BarChart3;

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
      <IconComponent size={20} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
        {anomaly.message}
      </span>
    </div>
  );
}
