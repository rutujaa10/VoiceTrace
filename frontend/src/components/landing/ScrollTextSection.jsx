import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import useIsMobile from '../../hooks/useIsMobile';
import MagicBento from './MagicBento';
import ScrollFloat from './ScrollFloat';

/* ─── Data ────────────────────────────────────────────────── */
const heroLine1 = 'Your Business,';
const heroLine2 = 'Reimagined.';
const tagline = 'No typing. No apps. Just speak and grow.';

const paragraphs = [
  {
    num: '01',
    label: 'WHAT',
    text: 'VoiceTrace is a revolutionary voice-powered business intelligence platform that transforms spoken transactions into structured digital records using advanced AI transcription and multilingual processing.',
  },
  {
    num: '02',
    label: 'HOW',
    text: 'Our platform leverages speech-to-text AI to capture sales in any language, then auto-categorizes transactions, builds smart ledgers, and generates real-time business analytics with loan readiness scoring.',
  },
  {
    num: '03',
    label: 'WHO',
    text: 'Whether you are a street vendor tracking daily sales or a small business owner seeking micro-finance, VoiceTrace provides instant business insights with offline support and comprehensive financial analytics.',
  },
];

/* ─── Main Component ──────────────────────────────────────── */
export default function ScrollTextSection() {
  const isMobile = useIsMobile();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  /* Only animate header elements on scroll */
  const labelOpacity = useTransform(scrollYProgress, [0, 0.04], [0, 1]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.06], [0, 1]);
  const titleY = useTransform(scrollYProgress, [0, 0.06], [40, 0]);
  const taglineOpacity = useTransform(scrollYProgress, [0.06, 0.12], [0, 1]);
  const taglineY = useTransform(scrollYProgress, [0.06, 0.12], [20, 0]);
  const dividerWidth = useTransform(scrollYProgress, [0.12, 0.2], ['0%', '100%']);
  const cardsOpacity = useTransform(scrollYProgress, [0.18, 0.28], [0, 1]);
  const cardsY = useTransform(scrollYProgress, [0.18, 0.28], [40, 0]);

  return (
    <section
      id="scroll-text-section"
      ref={containerRef}
      style={{ height: isMobile ? '250vh' : '350vh', position: 'relative' }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isMobile ? 'flex-start' : 'center',
          padding: isMobile ? '5rem 5vw 2rem' : '0 8vw',
          background: 'var(--bg-primary)',
          overflow: 'hidden',
        }}
      >
        {/* Badge */}
        <motion.div style={{ opacity: labelOpacity, marginBottom: isMobile ? '1rem' : '2rem' }}>
          <span style={{
            display: 'inline-block', padding: '0.4rem 1.2rem', borderRadius: '999px',
            fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 700, color: '#22c55e',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
            letterSpacing: '0.15em', textTransform: 'uppercase',
          }}>
            About the Project
          </span>
        </motion.div>

        {/* Title */}
        <div style={{ marginBottom: isMobile ? '0.25rem' : '0.5rem' }}>
          <ScrollFloat
            animationDuration={1}
            ease="back.inOut(2)"
            scrollStart="center bottom+=50%"
            scrollEnd="bottom bottom-=40%"
            stagger={0.01}
            containerClassName="font-display"
            textClassName="scroll-float-section-title"
          >
            Your Business, Reimagined.
          </ScrollFloat>
        </div>

        {/* Tagline */}
        <motion.p className="font-display" style={{
          opacity: taglineOpacity, y: taglineY,
          fontSize: 'clamp(1.1rem, 2vw, 1.5rem)', fontWeight: 400,
          color: 'var(--text-muted)', margin: 0, marginTop: '0.5rem',
          paddingBottom: isMobile ? '1.5rem' : '3rem',
          letterSpacing: '-0.01em',
        }}>
          {tagline}
        </motion.p>

        {/* Divider */}
        <motion.div style={{
          width: dividerWidth, height: '2px',
          background: 'linear-gradient(90deg, #22c55e, transparent)',
          marginBottom: isMobile ? '1.5rem' : '3rem',
        }} />

        {/* Paragraph cards — static content, MagicBento effects */}
        <motion.div
          style={{
            opacity: cardsOpacity,
            y: cardsY,
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? '1rem' : '1.5rem',
            maxWidth: '1100px',
          }}
        >
          {paragraphs.map((para, i) => (
            <MagicBento
              key={i}
              enableStars
              enableSpotlight
              enableBorderGlow
              enableTilt
              clickEffect
              spotlightRadius={350}
              particleCount={8}
              glowColor="34, 197, 94"
              style={{ padding: isMobile ? '1.2rem' : '1.5rem' }}
            >
              {/* Number + Label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '2rem', height: '2rem', borderRadius: '0.5rem',
                  background: 'rgba(34,197,94,0.1)', fontSize: '0.75rem',
                  fontWeight: 800, color: '#22c55e',
                }}>
                  {para.num}
                </span>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.15em',
                  textTransform: 'uppercase', color: '#22c55e',
                }}>
                  {para.label}
                </span>
              </div>
              <p style={{
                fontSize: isMobile ? '0.88rem' : '0.92rem', lineHeight: 1.75,
                color: 'var(--text-secondary)', margin: 0,
              }}>
                {para.text}
              </p>
            </MagicBento>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
