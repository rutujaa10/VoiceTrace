import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Mic, 
  ArrowRight, 
  Zap, 
  Globe, 
  Phone, 
  MessageSquare, 
  TableProperties, 
  TrendingUp,
  Check,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Coffee,
  UtensilsCrossed
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import useIsMobile from '../../hooks/useIsMobile';
import MagicBento from './MagicBento';

gsap.registerPlugin(ScrollTrigger);

/* ─── Hover Button ────────────────────────────────────────── */
function HoverButton({ children, primary, to, onClick }) {
  const [hovered, setHovered] = useState(false);
  const baseStyle = primary
    ? {
        background: hovered ? 'linear-gradient(135deg, #16a34a, #059669)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
        color: '#fff', border: 'none',
        boxShadow: hovered ? '0 12px 40px rgba(34,197,94,0.45)' : '0 6px 20px rgba(34,197,94,0.25)',
      }
    : {
        background: hovered ? 'var(--bg-tertiary)' : 'transparent',
        color: 'var(--text-primary)',
        border: '1.5px solid var(--border-glass)',
        boxShadow: 'none',
      };
  const btn = (
    <motion.button
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={onClick} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
      style={{ ...baseStyle, padding: '0.9rem 2rem', borderRadius: '999px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.3s, box-shadow 0.3s, border 0.3s', fontFamily: 'inherit' }}
    >{children}</motion.button>
  );
  if (onClick) return btn;
  return <Link to={to || '/'}>{btn}</Link>;
}

/* ─── TitleFloat — GSAP word-level scroll reveal ──────────── */
function TitleFloat({ words, highlightWords, isMobile }) {
  const titleRef = useRef(null);
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const wordEls = el.querySelectorAll('.title-word');
    gsap.fromTo(
      wordEls,
      { opacity: 0, yPercent: 120, scaleY: 2.3, scaleX: 0.7, transformOrigin: '50% 0%' },
      {
        duration: 1,
        ease: 'back.inOut(2)',
        opacity: 1,
        yPercent: 0,
        scaleY: 1,
        scaleX: 1,
        stagger: 0.08,
        scrollTrigger: {
          trigger: el,
          start: 'center bottom+=50%',
          end: 'bottom bottom-=40%',
          scrub: true,
        },
      }
    );
    return () => ScrollTrigger.getAll().forEach((t) => { if (t.trigger === el) t.kill(); });
  }, []);

  return (
    <h2
      ref={titleRef}
      className="font-display"
      style={{
        fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)',
        fontWeight: 900,
        lineHeight: 1.1,
        letterSpacing: '-0.03em',
        marginBottom: isMobile ? '1rem' : '1.5rem',
        overflow: 'hidden',
        textAlign: 'center',
      }}
    >
      {words.map((word, i) => (
        <span
          key={i}
          className="title-word"
          style={{
            display: 'inline-block',
            color: highlightWords.includes(word) ? '#22c55e' : 'var(--text-primary)',
            marginRight: '0.3em',
          }}
        >
          {word}
        </span>
      ))}
    </h2>
  );
}

/* ─── 1. Smart Ledger Card ────────────────────────────────── */
function SmartLedgerCard() {
  const rows = [
    { item: 'Chai', icon: <Coffee size={12} />, qty: 200, price: 15, total: 3000, conf: 'High', confColor: '#22c55e', confBg: 'rgba(34,197,94,0.1)' },
    { item: 'Samosa', icon: <UtensilsCrossed size={12} />, qty: 50, price: 20, total: 1000, conf: 'High', confColor: '#22c55e', confBg: 'rgba(34,197,94,0.1)' },
    { item: 'Vada Pav', icon: <UtensilsCrossed size={12} />, qty: 30, price: 25, total: 750, conf: 'Medium', confColor: '#f59e0b', confBg: 'rgba(245,158,11,0.1)' },
    { item: 'Pani Puri', icon: <UtensilsCrossed size={12} />, qty: '?', price: 10, total: '—', conf: 'Low', confColor: '#ef4444', confBg: 'rgba(239,68,68,0.1)' },
  ];
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
        <TableProperties size={20} style={{ color: '#22c55e' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Editable Smart Ledger</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr>
              {['Item', 'Qty', 'Price', 'Total', 'Confidence'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '0.4rem 0.6rem', color: '#22c55e', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.03em', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.6rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ opacity: 0.6 }}>{r.icon}</span>
                  {r.item}
                </td>
                <td style={{ padding: '0.6rem', color: 'var(--text-secondary)' }}>{r.qty}</td>
                <td style={{ padding: '0.6rem', color: 'var(--text-secondary)' }}>₹{r.price}</td>
                <td style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>{typeof r.total === 'number' ? `₹${r.total}` : r.total}</td>
                <td style={{ padding: '0.6rem' }}>
                  <span style={{ padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, color: r.confColor, background: r.confBg }}>{r.conf}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ─── 2. Conversational AI Card ───────────────────────────── */
function AIAssistantCard() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        <MessageSquare size={20} style={{ color: '#22c55e' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Conversational AI Assistant</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
          <div style={{ background: '#22c55e', color: '#fff', padding: '0.6rem 1rem', borderRadius: '1rem 1rem 0.3rem 1rem', fontSize: '0.82rem', fontWeight: 500 }}>
            "Aaj 200 chai biki, 50 samose bhi"
          </div>
        </div>
        <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
          <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '0.6rem 1rem', borderRadius: '1rem 1rem 1rem 0.3rem', fontSize: '0.82rem', lineHeight: 1.5 }}>
            Got it! 200 chai & 50 samosa recorded. What was the price today?
          </div>
        </div>
        <div style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
          <div style={{ background: '#22c55e', color: '#fff', padding: '0.6rem 1rem', borderRadius: '1rem 1rem 0.3rem 1rem', fontSize: '0.82rem', fontWeight: 500 }}>
            "₹15 chai, ₹20 samosa"
          </div>
        </div>
        <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
          <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '0.6rem 1rem', borderRadius: '1rem 1rem 1rem 0.3rem', fontSize: '0.82rem', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={14} style={{ color: '#22c55e' }} />
            Logged! Today's revenue: ₹4,000
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── 3. WhatsApp Ready Card ──────────────────────────────── */
function WhatsAppCard() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        <Phone size={20} style={{ color: '#22c55e' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>WhatsApp Ready</span>
      </div>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '0.75rem', padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>AL</div>
          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Awaaz Ledger</span>
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: '0.6rem', padding: '0.5rem 0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Voice Note • 0:12</span>
          </div>
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center', height: '20px' }}>
            {[4,8,12,6,14,10,16,8,12,6,14,10,8,12,16,10,6,14,8,12].map((h, i) => (
              <div key={i} style={{ width: '3px', height: `${h}px`, borderRadius: '2px', background: '#f59e0b', opacity: 0.7 }} />
            ))}
          </div>
        </div>
        <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: '0.6rem', padding: '0.5rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={12} style={{ color: '#22c55e' }} />
            Entry logged: 30 vada pav sold
            <Check size={12} style={{ color: '#22c55e' }} />
          </span>
        </div>
      </div>
    </>
  );
}

/* ─── 4. Loan Readiness Score Card ────────────────────────── */
function LoanScoreCard() {
  const score = 78;
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        <TrendingUp size={20} style={{ color: '#22c55e' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Loan Readiness Score</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#22c55e" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
              transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#22c55e' }}>{score}</span>
            <span style={{ fontSize: '0.55rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>/ 100</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {[
            { label: 'Revenue Consistency', value: '92%', color: '#22c55e' },
            { label: 'Transaction Volume', value: '85%', color: '#14b8a6' },
            { label: 'Business Age', value: '6 mo', color: '#10b981' },
          ].map((m, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{m.label}</span>
                <span style={{ color: m.color, fontWeight: 700 }}>{m.value}</span>
              </div>
              <div style={{ height: '4px', borderRadius: '2px', background: 'var(--border-subtle)' }}>
                <div style={{ height: '100%', borderRadius: '2px', background: m.color, width: m.value, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ─── Feature Pills ───────────────────────────────────────── */
const featurePills = [
  { icon: Mic, label: '12+ Languages' },
  { icon: Globe, label: 'Offline Ready' },
  { icon: Zap, label: 'Real-Time' },
];

/* ─── Main Component ──────────────────────────────────────── */
export default function ExpandingCTA() {
  const isMobile = useIsMobile();
  const highlightWords = ['Empowered', 'Voice'];
  const titleWords = 'Your Business, Empowered by Your Voice'.split(' ');
  const descText = 'Record sales in your language, get AI-powered transcription, automatic bookkeeping, business insights, and micro-loan readiness scores — all from a simple voice command. No typing needed.';

  return (
    <section id="expanding-cta" style={{ position: 'relative', background: 'var(--bg-primary)', padding: isMobile ? '4rem 1rem' : '6rem 2rem', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
      {/* Background dot-grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, var(--border-subtle) 1px, transparent 0)', backgroundSize: '40px 40px', pointerEvents: 'none', opacity: 0.5 }} />
      {/* Floating ambient orbs */}
      <motion.div
        animate={{ y: [0, -15, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '10%', left: '15%', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.06), transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }}
      />
      <motion.div
        animate={{ y: [0, 20, 0], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{ position: 'absolute', bottom: '15%', right: '10%', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,184,166,0.05), transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }}
      />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: '1100px', width: '100%', textAlign: 'center' }}>
        {/* Badge — fade in + pulse */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: isMobile ? '1.5rem' : '2rem' }}
        >
          <motion.span
            animate={{ boxShadow: ['0 0 0px rgba(34,197,94,0)', '0 0 20px rgba(34,197,94,0.15)', '0 0 0px rgba(34,197,94,0)'] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1.2rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', letterSpacing: '0.1em' }}
          >
            <Mic size={14} /> Voice-Powered Business Intelligence
          </motion.span>
        </motion.div>

        {/* Title — GSAP scroll-triggered word animation with original colors */}
        <TitleFloat words={titleWords} highlightWords={highlightWords} isMobile={isMobile} />

        {/* Description — slide up */}
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto', marginBottom: isMobile ? '1.5rem' : '2rem' }}
        >
          {descText}
        </motion.p>

        {/* Feature pills — staggered entrance */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 1 }}
          style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: isMobile ? '1.5rem' : '2rem' }}
        >
          {featurePills.map((fp, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 1.1 + i * 0.12 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 1rem', borderRadius: '999px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}
            >
              <fp.icon size={13} style={{ color: '#22c55e' }} /> {fp.label}
            </motion.span>
          ))}
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 1.3 }}
          style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: isMobile ? '2.5rem' : '3.5rem' }}
        >
          <HoverButton primary onClick={() => { const t = document.getElementById('scroll-text-section'); if (t) t.scrollIntoView({ behavior: 'smooth' }); }}>
            <Mic size={16} /> Get Started <ArrowRight size={16} />
          </HoverButton>
          <HoverButton to="/">Learn More</HoverButton>
        </motion.div>

        {/* ────── 4 Feature Preview Cards with MagicBento ────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: isMobile ? '1rem' : '1.5rem',
          textAlign: 'left',
        }}>
          {[SmartLedgerCard, AIAssistantCard, WhatsAppCard, LoanScoreCard].map((CardContent, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 1.4 + i * 0.15 }}
            >
              <MagicBento
                enableStars
                enableSpotlight
                enableBorderGlow
                enableTilt
                clickEffect
                spotlightRadius={380}
                particleCount={12}
                glowColor="34, 197, 94"
                style={{ padding: '1.5rem' }}
              >
                <CardContent />
              </MagicBento>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
