import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Menu, X, LogIn, Moon, Sun, ArrowRight } from 'lucide-react';
import { useTheme } from '../../state/ThemeContext';
import useIsMobile from '../../hooks/useIsMobile';



export default function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const isHome = location.pathname === '/';

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 1000,
          padding: scrolled ? '0.5rem 0' : '1rem 0',
          transition: 'padding 0.4s ease',
        }}
      >
        {/* Glassmorphism background — slides in on scroll */}
        <motion.div
          animate={{
            opacity: scrolled ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute', inset: 0,
            background: isDark
              ? 'rgba(10, 10, 20, 0.85)'
              : 'rgba(250, 250, 248, 0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: isDark
              ? '1px solid rgba(255,255,255,0.06)'
              : '1px solid rgba(0,0,0,0.06)',
            boxShadow: scrolled
              ? '0 4px 30px rgba(0,0,0,0.18)'
              : 'none',
          }}
        />

        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '3.5rem' }}>

            {/* ── Logo ── */}
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
              <div style={{
                width: '2.25rem', height: '2.25rem', borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, #22c55e, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px rgba(34,197,94,0.35)',
                flexShrink: 0,
              }}>
                <Mic size={18} color="white" />
              </div>
              <span style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '1.15rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: scrolled
                  ? 'var(--text-primary)'
                  : 'rgba(255,255,255,0.95)',
                transition: 'color 0.4s ease',
              }}>
                VoiceTrace
              </span>
            </Link>

            {/* ── Desktop Nav ── */}
            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                {/* Theme toggle */}
                <motion.button
                  whileHover={{ scale: 1.08, rotate: 15 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={toggleTheme}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '2.25rem', height: '2.25rem', borderRadius: '50%',
                    border: scrolled
                      ? (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)')
                      : '1px solid rgba(255,255,255,0.12)',
                    cursor: 'pointer',
                    background: scrolled
                      ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')
                      : 'rgba(255,255,255,0.1)',
                    color: scrolled ? 'var(--text-primary)' : 'rgba(255,255,255,0.85)',
                    transition: 'all 0.3s ease',
                  }}
                  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDark ? <Sun size={15} /> : <Moon size={15} />}
                </motion.button>

                {/* Home */}
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.42rem 1rem',
                    borderRadius: '999px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    cursor: 'pointer',
                    color: scrolled ? 'var(--text-primary)' : 'rgba(255,255,255,0.85)',
                    border: scrolled
                      ? (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)')
                      : '1px solid rgba(255,255,255,0.18)',
                    background: 'transparent',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.borderColor = scrolled
                      ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)')
                      : 'rgba(255,255,255,0.3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = scrolled
                      ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')
                      : 'rgba(255,255,255,0.18)';
                  }}
                >
                  Home
                </button>

                {/* Login — green CTA */}
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/login"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.45rem 1.1rem',
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      fontFamily: "'Inter', sans-serif",
                      textDecoration: 'none',
                      color: '#fff',
                      background: 'linear-gradient(135deg, #22c55e, #059669)',
                      boxShadow: '0 0 18px rgba(34,197,94,0.35)',
                      transition: 'box-shadow 0.3s ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(34,197,94,0.55)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 18px rgba(34,197,94,0.35)'; }}
                  >
                    <LogIn size={14} />
                    Login
                  </Link>
                </motion.div>
              </div>
            )}

            {/* ── Mobile controls ── */}
            {isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={toggleTheme}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '2.25rem', height: '2.25rem', borderRadius: '50%',
                    border: 'none', background: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
                  }}
                >
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '2.25rem', height: '2.25rem', borderRadius: '50%',
                    border: 'none', background: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
                  }}
                >
                  {menuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.nav>

      {/* ── Mobile menu overlay ── */}
      <AnimatePresence>
        {menuOpen && isMobile && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'fixed', top: '4.5rem', left: '1rem', right: '1rem',
              zIndex: 999,
              background: isDark ? 'rgba(12,12,24,0.97)' : 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(24px)',
              borderRadius: '1.25rem',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.24)',
              padding: '1rem',
              display: 'flex', flexDirection: 'column', gap: '0.25rem',
            }}
          >


            <Link to="/login" onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1rem', borderRadius: '0.75rem',
                fontSize: '0.95rem', fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                textDecoration: 'none', color: 'var(--text-primary)',
              }}>
              <LogIn size={16} /> Login
            </Link>

            <Link to="/register" onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.75rem 1rem', borderRadius: '0.75rem',
                fontSize: '0.95rem', fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
                textDecoration: 'none', color: '#fff',
                background: 'linear-gradient(135deg, #22c55e, #059669)',
                marginTop: '0.25rem',
              }}>
              Get Started <ArrowRight size={16} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
