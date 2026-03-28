import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import useIsMobile from '../../hooks/useIsMobile';

const lines = [
  {
    text: 'VOICE AI',
    revealText: 'SMART RECORDING',
    reveal: 'Multilingual speech-to-text conversion for natural transaction recording — supports 12+ Indian languages with 95% accuracy.',
  },
  {
    text: 'SMART LEDGER',
    revealText: 'AUTO BOOKKEEPING',
    reveal: 'Every spoken transaction auto-categorized, timestamped, and organized into a beautiful digital ledger with zero manual entry.',
  },
  {
    text: 'ANALYTICS',
    revealText: 'BUSINESS INSIGHTS',
    reveal: 'Real-time dashboards with sales trends, peak hours, best-selling items, profit margins, and AI-powered growth recommendations.',
  },
  {
    text: 'LOAN SCORE',
    revealText: 'CREDIT READINESS',
    reveal: 'Automatic creditworthiness scoring (0–100) based on transaction consistency and revenue patterns for micro-loan applications.',
  },
  {
    text: 'AI ASSISTANT',
    revealText: 'CHAT WITH DATA',
    reveal: 'Ask business questions in plain language. Get instant answers, trend analysis, and actionable recommendations from your data.',
  },
];

const fontStyle = {
  fontSize: 'clamp(2.8rem, 8vw, 7rem)',
  fontWeight: 900,
  letterSpacing: '-0.03em',
  lineHeight: 1.15,
  userSelect: 'none',
  whiteSpace: 'nowrap',
};

function RevealLine({ text, revealText, reveal, progress, index, isMobile }) {
  const offset = index * 0.03;
  const fillProgress = useTransform(
    progress,
    [0.05 + offset, 0.65 + offset * 0.4],
    [0, 1]
  );

  return (
    <div
      className="reveal-line"
      style={{
        position: 'relative',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.06))',
        padding: 'clamp(0.5rem, 1vw, 0.8rem) 0',
      }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ ...fontStyle, fontSize: isMobile ? 'clamp(1.6rem, 10vw, 2.5rem)' : fontStyle.fontSize, color: 'var(--reveal-dim)', display: 'block' }}>
            {text}
          </span>
          <motion.div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              clipPath: useTransform(fillProgress, (v) => `inset(0 ${(1 - v) * 100}% 0 0)`),
            }}
          >
            <span style={{ ...fontStyle, fontSize: isMobile ? 'clamp(1.6rem, 10vw, 2.5rem)' : fontStyle.fontSize, color: 'var(--text-primary)', display: 'block' }}>{text}</span>
          </motion.div>
        </div>

        <motion.span
          style={{
            fontSize: 'clamp(0.7rem, 1vw, 0.9rem)',
            fontWeight: 600,
            color: 'var(--reveal-dim)',
            letterSpacing: '0.05em',
            flexShrink: 0,
            marginLeft: '2rem',
            opacity: useTransform(fillProgress, [0, 0.5, 1], [0.3, 0.6, 1]),
          }}
        >
          0{index + 1}
        </motion.span>
      </div>

      {/* Hover reveal */}
      <div
        className="reveal-panel"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--reveal-panel-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 1rem' : '0 clamp(1.5rem, 2.5vw, 3rem)',
          flexDirection: isMobile ? 'column' : 'row',
          clipPath: 'inset(50% 0 50% 0)',
          transition: 'clip-path 0.45s cubic-bezier(0.4,0,0.2,1)',
          zIndex: 5,
          overflow: 'hidden',
        }}
      >
        <span style={{ ...fontStyle, fontSize: isMobile ? 'clamp(1.6rem, 10vw, 2.5rem)' : fontStyle.fontSize, color: 'var(--reveal-panel-text)', flexShrink: 0 }}>
          {revealText}
        </span>
        <p
          style={{
            fontSize: isMobile ? '0.75rem' : 'clamp(0.78rem, 0.95vw, 0.9rem)',
            color: 'var(--reveal-panel-desc)',
            lineHeight: 1.55,
            margin: 0,
            textAlign: isMobile ? 'left' : 'right',
            whiteSpace: 'normal',
            maxWidth: '440px',
          }}
        >
          {reveal}
        </p>
      </div>
    </div>
  );
}

export default function ScrollRevealText() {
  const isMobile = useIsMobile();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.85', 'end 0.2'],
  });

  return (
    <>
      <style>{`
        .reveal-line:hover .reveal-panel {
          clip-path: inset(0 0 0 0) !important;
        }
      `}</style>

      <section
        ref={containerRef}
        style={{
          background: 'var(--bg-primary)',
          padding: isMobile ? 'clamp(2rem, 5vw, 3rem) clamp(1rem, 3vw, 2rem)' : 'clamp(4rem, 8vw, 7rem) clamp(2rem, 5vw, 5rem)',
          position: 'relative',
        }}
      >
        <div style={{ marginBottom: 'clamp(2rem, 3vw, 3rem)' }}>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#22c55e',
              padding: '0.3rem 0.8rem',
              borderRadius: '999px',
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.12)',
              display: 'inline-block',
            }}
          >
            Our Technology Stack
          </span>
        </div>

        {lines.map((line, i) => (
          <RevealLine
            key={i}
            text={line.text}
            revealText={line.revealText}
            reveal={line.reveal}
            progress={scrollYProgress}
            index={i}
            isMobile={isMobile}
          />
        ))}
      </section>
    </>
  );
}
