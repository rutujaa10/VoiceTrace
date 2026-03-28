import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useMotionValue, useInView } from 'framer-motion';

const cards = [
  {
    title: 'Voice Recording',
    desc: 'Speak your sales naturally in any Indian language. Our AI captures item names, quantities, and prices from free-flowing conversation — no structured input required.',
    stat: '12+ Languages',
    accent: '#22c55e',
    image: '/images/cards/voice_recording.png',
  },
  {
    title: 'Smart Ledger',
    desc: 'Every spoken transaction is automatically categorized, timestamped, and organized into a beautiful digital ledger with expense tracking and daily summaries.',
    stat: 'Auto-Sorted',
    accent: '#16a34a',
    image: '/images/cards/smart_ledger.png',
  },
  {
    title: 'Business Analytics',
    desc: 'Real-time dashboards show sales trends, peak hours, best-selling items, and profit margins. Make data-driven decisions with AI-powered insights.',
    stat: 'Real-Time',
    accent: '#059669',
    image: '/images/cards/business_analytics.png',
  },
  {
    title: 'AI Assistant',
    desc: 'Ask questions about your business in plain language. "What was my best day this week?" — the AI assistant provides instant answers from your data.',
    stat: 'Instant',
    accent: '#10b981',
    image: '/images/cards/ai_assistant.png',
  },
  {
    title: 'Loan Readiness',
    desc: 'Build a verifiable financial track record automatically. Your loan readiness score helps banks and NBFCs evaluate your creditworthiness for micro-loans.',
    stat: '0–100 Score',
    accent: '#14b8a6',
    image: '/images/cards/loan_readiness.png',
  },
];

function StickyCard({ card, index }) {
  const vertMargin = 10;
  const container = useRef(null);
  const [maxScrollY, setMaxScrollY] = useState(Infinity);

  const scaleVal = useMotionValue(1);
  const rotateVal = useMotionValue(0);

  const { scrollY } = useScroll({ target: container });

  const isInView = useInView(container, {
    margin: `0px 0px -${100 - vertMargin}% 0px`,
    once: true,
  });

  useEffect(() => {
    if (isInView && maxScrollY === Infinity) {
      setMaxScrollY(scrollY.get());
    }
  }, [isInView]);

  useEffect(() => {
    const unsubscribe = scrollY.on('change', (currentY) => {
      let animVal = 1;
      if (currentY > maxScrollY) {
        animVal = Math.max(0, 1 - (currentY - maxScrollY) / 8000);
      }
      scaleVal.set(animVal);
      rotateVal.set((1 - animVal) * 80);
    });
    return unsubscribe;
  }, [maxScrollY, scrollY, scaleVal, rotateVal]);

  return (
    <motion.div
      ref={container}
      style={{
        scale: scaleVal,
        rotate: rotateVal,
        position: 'sticky',
        top: `${vertMargin}vh`,
        height: `${100 - 2 * vertMargin}vh`,
        width: '100%',
        maxWidth: '1000px',
        borderRadius: '2rem',
        overflow: 'hidden',
        background: 'var(--card-bg, #1a1a2e)',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.05)',
        willChange: 'transform',
        transformOrigin: 'center center',
      }}
    >
      <img
        src={card.image}
        alt={card.title}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '3rem 3.5rem',
          background:
            'linear-gradient(to top, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 45%, rgba(255,255,255,0) 100%)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1.1rem',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.9)',
            border: `1.5px solid ${card.accent}40`,
            marginBottom: '1rem',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: card.accent,
            }}
          />
          <span
            style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: card.accent,
              letterSpacing: '0.02em',
            }}
          >
            {card.stat}
          </span>
        </div>

        <h3
          className="font-display"
          style={{
            fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '0.75rem',
            lineHeight: 1.2,
          }}
        >
          {card.title}
        </h3>

        <p
          style={{
            fontSize: '1rem',
            lineHeight: 1.7,
            color: 'rgba(0,0,0,0.55)',
            margin: 0,
            maxWidth: '550px',
          }}
        >
          {card.desc}
        </p>
      </div>
    </motion.div>
  );
}

export default function StackingCards() {

  return (
    <section
      style={{
        background: 'var(--bg-primary)',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '6rem 4vw 3rem',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '0.4rem 1.2rem',
            borderRadius: '999px',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#22c55e',
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.12)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '1.5rem',
          }}
        >
          Capabilities
        </span>
        <h2
          className="font-display"
          style={{
            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
            fontWeight: 800,
            color: 'var(--text-primary)',
          }}
        >
          Smart{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #22c55e, #16a34a, #059669)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Business Tools
          </span>
        </h2>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10vh',
          padding: '0 4vw',
          paddingTop: '30vh',
          paddingBottom: '50vh',
          overflow: 'visible',
        }}
      >
        {cards.map((card, i) => (
          <StickyCard key={i} card={card} index={i} />
        ))}
      </div>
    </section>
  );
}
