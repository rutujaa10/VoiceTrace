/**
 * InsightCard — Modern borderless insight display
 *
 * Features:
 * - Rounded-2xl, borderless design with soft shadow
 * - Larger icon in soft circle
 * - Time badge as subtle pill
 * - Hover scale + shadow expansion
 */

import { CloudSun, Package, TrendingDown, BookOpen, Map, CloudLightning, Target, BookOpenCheck, Lightbulb } from 'lucide-react';

export default function InsightCard({ insight }) {
  const typeConfig = {
    prediction: { icon: CloudSun, color: 'rgba(59, 130, 246, 0.12)' },
    stock_advice: { icon: Package, color: 'rgba(99, 102, 241, 0.12)' },
    missed_profit: { icon: TrendingDown, color: 'rgba(239, 68, 68, 0.12)' },
    weekly_story: { icon: BookOpen, color: 'rgba(168, 85, 247, 0.12)' },
    csi: { icon: Map, color: 'rgba(34, 197, 94, 0.12)' },
    weather_alert: { icon: CloudLightning, color: 'rgba(245, 158, 11, 0.12)' },
    loan_milestone: { icon: Target, color: 'rgba(236, 72, 153, 0.12)' },
    daily_summary: { icon: BookOpenCheck, color: 'rgba(99, 102, 241, 0.12)' },
  };

  const config = typeConfig[insight.type] || { icon: Lightbulb, color: 'rgba(99, 102, 241, 0.12)' };
  const IconComponent = config.icon;

  const timeAgo = (date) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-2xl)',
        padding: '16px 20px',
        display: 'flex',
        gap: '14px',
        alignItems: 'flex-start',
        transition: 'all 0.25s ease',
        cursor: 'default',
        boxShadow: '0 1px 6px -1px rgba(0,0,0,0.05)',
        border: '1px solid var(--border-subtle)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.01)';
        e.currentTarget.style.boxShadow = '0 4px 20px -4px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 1px 6px -1px rgba(0,0,0,0.05)';
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          background: config.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <IconComponent size={22} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '0.92rem',
            fontWeight: 700,
            marginBottom: '4px',
            color: 'var(--text-primary)',
          }}
        >
          {insight.title}
        </h4>
        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
            margin: 0,
            whiteSpace: 'pre-line',
          }}
        >
          {insight.content?.length > 200
            ? insight.content.slice(0, 200) + '...'
            : insight.content}
        </p>

        {/* Time pill */}
        {insight.createdAt && (
          <span
            style={{
              display: 'inline-block',
              marginTop: '8px',
              fontSize: '0.68rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'rgba(0,0,0,0.04)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            {timeAgo(insight.createdAt)}
          </span>
        )}
      </div>

      {/* Unread dot */}
      {!insight.isRead && (
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--gradient-primary)',
            flexShrink: 0,
            marginTop: 8,
            boxShadow: '0 0 8px rgba(34, 197, 94, 0.4)',
          }}
        />
      )}
    </div>
  );
}
