import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Mic, Cpu, BarChart3, Wallet, Shield } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

const infoItems = [
  {
    num: 1,
    icon: Mic,
    title: 'Voice Recording',
    desc: 'Tap the mic and talk — VoiceTrace understands Hindi, Tamil, Telugu, Kannada, and English. No forms, no typing. Just speak your sales like you would to a friend.',
    image: '/images/cards/voice_input_ui.png',
  },
  {
    num: 2,
    icon: Cpu,
    title: 'AI Transcription',
    desc: 'Our NLP engine listens to your natural speech and extracts items, quantities, and prices in real-time. It handles accents, background noise, and mixed-language conversations.',
    image: '/images/cards/ai_nlp_engine.png',
  },
  {
    num: 3,
    icon: BarChart3,
    title: 'Smart Ledger',
    desc: 'Every transaction is automatically sorted, timestamped, and filed into a clean digital khata. View daily, weekly, and monthly summaries with one tap.',
    image: '/images/cards/digital_ledger_ui.png',
  },
  {
    num: 4,
    icon: Wallet,
    title: 'Loan Readiness',
    desc: 'Your consistent sales data builds a credibility score that banks and NBFCs trust. Get micro-loan ready without paperwork — your voice is your proof.',
    image: '/images/cards/credit_score_gauge.png',
  },
  {
    num: 5,
    icon: Shield,
    title: 'Business Analytics',
    desc: 'See what sells best, when your peak hours are, and where your profits come from. AI-powered charts and recommendations help you grow smarter every week.',
    image: '/images/cards/analytics_dashboard.png',
  },
];

export default function HorizontalInfoSection() {
  const isMobile = useIsMobile();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const n = infoItems.length; // 5
  // Give each card an equal share of scroll range (0..1)
  // segStart, segPeak, segEnd are calculated so card 5 fits fully within [0,1]
  const getSegments = (i) => {
    const sliceSize = 1 / n;
    const segStart = i * sliceSize;
    const segPeak  = segStart + sliceSize * 0.45;
    const segEnd   = segStart + sliceSize;
    return { segStart, segPeak, segEnd };
  };

  // Dot position: spread evenly from 0% to 100%
  const getDotPos = (i) => i / (n - 1);

  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  /* ─── MOBILE: one card at a time ─────────────────────────── */
  if (isMobile) {
    return (
      <section
        ref={containerRef}
        style={{ height: `${n * 100}vh`, position: 'relative' }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'hidden',
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            paddingTop: '4rem',
          }}
        >
          {/* Timeline dots */}
          <div style={{ padding: '0 6vw', marginBottom: '1.5rem' }}>
            <div style={{ width: '100%', height: '3px', background: 'rgba(128,128,128,0.2)', borderRadius: '2px', position: 'relative', overflow: 'visible' }}>
              <motion.div style={{ width: progressWidth, height: '100%', background: 'linear-gradient(90deg, #22c55e, #059669)', borderRadius: '2px', boxShadow: '0 0 12px rgba(34,197,94,0.4)' }} />
              {infoItems.map((item, i) => {
                const dotPos = getDotPos(i);
                return (
                  <motion.div
                    key={i}
                    style={{
                      position: 'absolute', left: `${dotPos * 100}%`, top: '50%', transform: 'translate(-50%, -50%)',
                      width: '1.4rem', height: '1.4rem', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: 800, zIndex: 2,
                      color: useTransform(scrollYProgress, [Math.max(0, dotPos - 0.05), Math.min(1, dotPos + 0.05)], ['rgba(255,255,255,0.3)', '#fff']),
                      background: useTransform(scrollYProgress, [Math.max(0, dotPos - 0.05), Math.min(1, dotPos + 0.05)], ['rgba(128,128,128,0.4)', '#22c55e']),
                      boxShadow: useTransform(scrollYProgress, [Math.max(0, dotPos - 0.05), Math.min(1, dotPos + 0.05)], ['none', '0 2px 10px rgba(34,197,94,0.5)']),
                    }}
                  >
                    {item.num}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* One card at a time — crossfade */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {infoItems.map((item, i) => {
              const { segStart, segPeak, segEnd } = getSegments(i);
              const isLast = i === n - 1;

              const cardOpacity = useTransform(
                scrollYProgress,
                [segStart, segPeak, segEnd - 0.02, segEnd],
                [0, 1, 1, isLast ? 1 : 0]
              );
              const cardY = useTransform(scrollYProgress, [segStart, segPeak], ['30px', '0px']);
              const IconComp = item.icon;

              return (
                <motion.div
                  key={i}
                  style={{
                    opacity: cardOpacity, y: cardY,
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '1rem 6vw', gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '55vw', maxWidth: '220px', aspectRatio: '3 / 4',
                      borderRadius: '1rem', overflow: 'hidden', background: '#fff',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(34,197,94,0.08)',
                      border: '1px solid rgba(34,197,94,0.12)', flexShrink: 0,
                    }}
                  >
                    <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ textAlign: 'center', maxWidth: '320px' }}>
                    <div style={{
                      width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem',
                      background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', margin: '0 auto 0.75rem',
                    }}>
                      <IconComp size={18} color="#22c55e" />
                    </div>
                    <h3 style={{
                      fontFamily: "'Georgia', 'Times New Roman', serif",
                      fontSize: '1.1rem', fontWeight: 700, fontStyle: 'italic',
                      color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.3,
                    }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--text-primary)', margin: 0 }}>
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  /* ─── DESKTOP ────────────── */
  return (
    <section
      ref={containerRef}
      style={{ height: `${n * 130}vh`, position: 'relative' }}
    >
      <div
        style={{
          position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
          background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Top half: image cards */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', position: 'relative', overflow: 'hidden', minHeight: 0, padding: '1rem 6vw 1.5rem' }}>
          <div style={{ display: 'flex', gap: '3vw', width: '100%' }}>
            {infoItems.map((item, i) => {
              const { segStart, segPeak, segEnd } = getSegments(i);
              const y = useTransform(scrollYProgress, [segStart, segPeak, segEnd], ['-120%', '0%', '0%']);
              const scale = useTransform(scrollYProgress, [segStart, segPeak, segEnd], [0.85, 1, 0.97]);
              return (
                <motion.div key={i} style={{ y, scale, flex: '0 0 auto', width: `${100 / n - 2}%`, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: '75%', maxWidth: '180px', aspectRatio: '3 / 4', borderRadius: '1rem', overflow: 'hidden', background: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.12)', position: 'relative' }}>
                    <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(34,197,94,0.12), transparent)', pointerEvents: 'none' }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Timeline bar — overflow visible so 5th dot at 100% doesn't clip */}
        <div style={{ padding: '0 6vw', position: 'relative', zIndex: 10 }}>
          <div style={{ width: '100%', height: '4px', background: 'rgba(128,128,128,0.2)', borderRadius: '2px', position: 'relative', overflow: 'visible' }}>
            <motion.div style={{ width: progressWidth, height: '100%', background: 'linear-gradient(90deg, #22c55e, #059669)', borderRadius: '2px', boxShadow: '0 0 12px rgba(34,197,94,0.4)' }} />
            {infoItems.map((item, i) => {
              const dotPos = getDotPos(i);
              // The dot activates when its corresponding card segment peaks
              const { segStart: ds, segPeak: dp } = getSegments(i);
              return (
                <motion.div
                  key={i}
                  style={{
                    position: 'absolute', left: `${dotPos * 100}%`, top: '50%', transform: 'translate(-50%, -50%)',
                    width: '2rem', height: '2rem', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 800, zIndex: 2,
                    color: useTransform(scrollYProgress, [Math.max(0, ds), Math.min(1, dp)], ['rgba(255,255,255,0.3)', '#ffffff']),
                    background: useTransform(scrollYProgress, [Math.max(0, ds), Math.min(1, dp)], ['rgba(128,128,128,0.4)', '#22c55e']),
                    boxShadow: useTransform(scrollYProgress, [Math.max(0, ds), Math.min(1, dp)], ['none', '0 2px 14px rgba(34,197,94,0.5)']),
                  }}
                >
                  {item.num}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom half: text content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', position: 'relative', overflow: 'hidden', padding: '2.5rem 6vw 3rem', minHeight: 0 }}>
          <div style={{ display: 'flex', gap: '3vw', width: '100%' }}>
            {infoItems.map((item, i) => {
              const { segStart, segPeak, segEnd } = getSegments(i);
              const y = useTransform(scrollYProgress, [segStart, segPeak, segEnd], ['60px', '0px', '0px']);
              const IconComp = item.icon;
              return (
                <motion.div key={i} style={{ y, flex: '0 0 auto', width: `${100 / n - 2}%` }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <IconComp size={18} color="#22c55e" />
                  </div>
                  <h3 style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: 'clamp(1rem, 1.5vw, 1.25rem)', fontWeight: 700, fontStyle: 'italic', color: 'var(--text-primary)', marginBottom: '0.6rem', lineHeight: 1.3 }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: 'clamp(0.8rem, 1vw, 0.92rem)', lineHeight: 1.65, color: 'var(--text-secondary)', margin: 0 }}>
                    {item.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
