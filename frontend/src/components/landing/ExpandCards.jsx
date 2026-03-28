import { useState } from 'react';
import { motion } from 'framer-motion';
import useIsMobile from '../../hooks/useIsMobile';

const cards = [
  {
    title: 'Voice Recording',
    subtitle: 'Multilingual Speech Capture',
    desc: 'Record sales transactions in Hindi, Tamil, Telugu, Kannada, or English. Our AI processes free-flowing natural language, extracting item names, quantities, and prices — no structured input needed. Works offline and syncs when connected.',
    image: '/images/cards/voice_recording.png',
  },
  {
    title: 'AI Transcription',
    subtitle: 'Speech-to-Ledger Engine',
    desc: 'Advanced NLP pipeline converts spoken transactions into structured data. Entity extraction identifies products, amounts, and currencies. Real-time processing with 95%+ accuracy across 12 Indian languages.',
    image: '/images/cards/ai_assistant.png',
  },
  {
    title: 'Smart Categorization',
    subtitle: 'Auto-Organize Transactions',
    desc: 'Machine learning automatically categorizes transactions by product type, customer segment, and time patterns. Smart tagging creates hierarchical product catalogs from your voice data without manual setup.',
    image: '/images/cards/smart_categorization.png',
  },
  {
    title: 'Business Insights',
    subtitle: 'AI-Powered Analytics Dashboard',
    desc: 'Real-time dashboards visualize sales trends, peak hours, profit margins, and seasonal patterns. AI generates actionable recommendations: "Stock more chai on Mondays — sales spike 40%."',
    image: '/images/cards/business_analytics.png',
  },
  {
    title: 'Financial Reports',
    subtitle: 'Comprehensive Business Intelligence',
    desc: 'Auto-generated P&L statements, cash flow analysis, and tax-ready summaries. Historical trend visualization over configurable time ranges. Export reports for bank submissions and micro-loan applications.',
    image: '/images/cards/financial_reports.png',
  },
  {
    title: 'Loan Readiness',
    subtitle: 'Micro-Finance Credit Scoring',
    desc: 'Continuous creditworthiness scoring (0-100) based on transaction consistency, revenue growth, and business stability. Banks and NBFCs can verify your financial history directly through VoiceTrace\'s secure API.',
    image: '/images/cards/loan_readiness.png',
  },
  {
    title: 'AI Assistant',
    subtitle: 'Natural Language Business Queries',
    desc: 'Ask questions in plain language: "What was my best-selling item this week?" or "How much profit did I make in January?" The AI assistant provides instant, accurate answers from your business data.',
    image: '/images/cards/ai_assistant.png',
  },
  {
    title: 'Offline Mode',
    subtitle: 'Progressive Web App Architecture',
    desc: 'Full functionality without internet — record transactions, view reports, and manage your ledger offline. Data syncs automatically when connectivity is restored, ensuring zero data loss even in low-network areas.',
    image: '/images/cards/offline_mode.png',
  },
];

export default function ExpandCards() {
  const [activeIdx, setActiveIdx] = useState(null);
  const isMobile = useIsMobile();

  return (
    <section
      style={{
        background: 'var(--bg-primary)',
        padding: 'clamp(3rem, 6vw, 5rem) 5vw',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Section title */}
      <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem, 4vw, 3rem)' }}>
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
            marginBottom: '1.2rem',
          }}
        >
          Explore Our Platform
        </span>
        <h2
          className="font-display"
          style={{
            fontSize: 'clamp(1.8rem, 3.5vw, 3rem)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          Powering the Future of{' '}
          <span className="gradient-text">Street Commerce</span>
        </h2>
      </div>

      {/* Cards container */}
      <div
        onMouseLeave={() => !isMobile && setActiveIdx(null)}
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'stretch',
          gap: isMobile ? '8px' : 'clamp(6px, 0.8vw, 12px)',
          height: isMobile ? 'auto' : 'clamp(380px, 50vw, 540px)',
          maxWidth: '1300px',
          margin: '0 auto',
        }}
      >
        {cards.map((card, i) => {
          const isActive = i === activeIdx;
          const hasActive = activeIdx !== null;

          return (
            <motion.div
              key={i}
              onMouseEnter={() => !isMobile && setActiveIdx(i)}
              onClick={() => isMobile && setActiveIdx(activeIdx === i ? null : i)}
              animate={{
                flex: isMobile ? 'none' : isActive ? 5 : hasActive ? 0.6 : 1,
              }}
              transition={{
                duration: 0.5,
                ease: [0.4, 0, 0.2, 1],
              }}
              style={{
                position: 'relative',
                borderRadius: 'clamp(14px, 1.8vw, 22px)',
                overflow: 'hidden',
                cursor: 'pointer',
                minWidth: 0,
                border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                ...(isMobile ? { height: isActive ? '320px' : '80px', transition: 'height 0.4s ease' } : {}),
              }}
            >
              {/* Background image */}
              <img
                src={card.image}
                alt={card.title}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isActive ? 'scale(1.05)' : 'scale(1.2)',
                }}
              />

              {/* Dark overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: isActive
                    ? 'linear-gradient(0deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.05) 100%)'
                    : 'linear-gradient(0deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.25) 100%)',
                  transition: 'background 0.5s ease',
                }}
              />

              {/* Content */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: isActive ? 'clamp(20px, 2.2vw, 32px)' : 'clamp(12px, 1.2vw, 18px)',
                  transition: 'padding 0.5s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: '#6ee7b7',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '0.3rem',
                    opacity: isActive ? 1 : 0.5,
                    transition: 'opacity 0.4s ease',
                  }}
                >
                  0{i + 1}
                </span>

                <h3
                  style={{
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: 0,
                    lineHeight: 1.2,
                    fontSize: isActive ? 'clamp(1.2rem, 2vw, 1.7rem)' : 'clamp(0.65rem, 0.85vw, 0.8rem)',
                    transition: 'font-size 0.5s cubic-bezier(0.4,0,0.2,1)',
                  }}
                >
                  {card.title}
                </h3>

                <div
                  style={{
                    maxHeight: isActive ? '300px' : '0px',
                    opacity: isActive ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'clamp(0.72rem, 0.85vw, 0.82rem)',
                      color: '#6ee7b7',
                      fontWeight: 600,
                      lineHeight: 1.3,
                      margin: 0,
                      marginTop: '0.4rem',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {card.subtitle}
                  </p>

                  <p
                    style={{
                      fontSize: 'clamp(0.72rem, 0.85vw, 0.82rem)',
                      color: 'rgba(255,255,255,0.75)',
                      lineHeight: 1.6,
                      margin: 0,
                      marginTop: '0.5rem',
                      maxWidth: '520px',
                    }}
                  >
                    {card.desc}
                  </p>
                </div>

                <div
                  style={{
                    height: '3px',
                    borderRadius: '2px',
                    background: '#22c55e',
                    marginTop: isActive ? '0.8rem' : '0.35rem',
                    width: isActive ? '48px' : '16px',
                    opacity: isActive ? 1 : 0.3,
                    transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
