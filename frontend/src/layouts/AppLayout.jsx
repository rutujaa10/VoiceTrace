/**
 * App Layout — Top navbar + Sidebar navigation + main content area
 */

import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useApp, actionTypes } from '../state/AppContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import { LayoutDashboard, Mic, FileText, BookOpen, Lightbulb, Bot, Home, LogOut, Menu, CheckCircle, RefreshCw } from 'lucide-react';

export default function AppLayout() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Redirect to login if no vendor
  if (!state.vendorId) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: '/app', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/app/record', icon: Mic, label: t('nav.record') },
    { path: '/app/daily-log', icon: FileText, label: t('nav.dailyLog') },
    { path: '/app/ledger', icon: BookOpen, label: t('nav.ledger') },
    { path: '/app/insights', icon: Lightbulb, label: t('nav.insights') },
    { path: '/app/assistant', icon: Bot, label: t('nav.assistant') },
  ];

  const handleLogout = () => {
    dispatch({ type: actionTypes.LOGOUT });
    navigate('/login', { replace: true });
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const vendorName = state.vendor?.name || state.dashboard?.vendor?.name || '';

  return (
    <div className="app-layout">
      {/* ═══ Top Navbar ═══ */}
      <header className="app-topbar" id="app-topbar">
        <div className="topbar-left">
          <button
            className="hamburger topbar-hamburger"
            onClick={() => dispatch({ type: actionTypes.TOGGLE_SIDEBAR })}
            aria-label="Toggle menu"
          >
            <Menu size={20} />
          </button>
          <NavLink to="/app" className="topbar-brand">
            <span className="topbar-logo"><Mic size={20} /></span>
            <span className="topbar-brand-text gradient-text">VoiceTrace</span>
          </NavLink>
        </div>

        <div className="topbar-right">
          <button
            id="btn-home"
            className="topbar-btn"
            onClick={handleGoHome}
            title="Go to Home Page"
          >
            <Home size={16} /> <span className="topbar-btn-label">Home</span>
          </button>

          {vendorName && (
            <div className="topbar-user">
              <div className="topbar-avatar">
                {vendorName.charAt(0).toUpperCase()}
              </div>
              <span className="topbar-username">{vendorName}</span>
            </div>
          )}

          <LanguageSwitcher />

          <button
            id="btn-logout"
            className="topbar-btn topbar-btn-danger"
            onClick={handleLogout}
            title={t('common.logout')}
          >
            <LogOut size={16} /> <span className="topbar-btn-label">{t('common.logout')}</span>
          </button>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="mobile-header">
        <button
          className="hamburger"
          onClick={() => dispatch({ type: actionTypes.TOGGLE_SIDEBAR })}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Mic size={18} /> VoiceTrace
        </span>
        <button
          className="hamburger"
          onClick={handleLogout}
          aria-label="Logout"
          style={{ fontSize: '1.2rem' }}
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Sidebar Overlay (mobile) */}
      {state.sidebarOpen && (
        <div
          className="sidebar-overlay visible"
          onClick={() => dispatch({ type: actionTypes.TOGGLE_SIDEBAR })}
        />
      )}

      {/* Sidebar */}
      <aside className={`app-sidebar ${state.sidebarOpen ? 'open' : ''}`}>
        <div className="nav-logo">
          <span className="logo-icon"><Mic size={22} /></span>
          <span className="gradient-text">VoiceTrace</span>
        </div>

        <nav>
          <ul className="nav-links">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/app'}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  onClick={() => {
                    if (state.sidebarOpen) {
                      dispatch({ type: actionTypes.TOGGLE_SIDEBAR });
                    }
                  }}
                >
                  <span className="nav-icon"><item.icon size={18} /></span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-lg)' }}>
          <div
            className="glass-card"
            style={{ padding: 'var(--space-md)', textAlign: 'center' }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              Loan Score
            </div>
            <div
              className="gradient-text"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.8rem',
                fontWeight: 800,
              }}
            >
              {state.loanScore?.score ?? '—'}/100
            </div>
            <div
              className={`badge ${
                state.loanScore?.isLoanReady ? 'badge-success' : 'badge-warning'
              }`}
              style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            >
              {state.loanScore?.isLoanReady ? <><CheckCircle size={14} /> Loan Ready</> : <><RefreshCw size={14} /> Building...</>}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
