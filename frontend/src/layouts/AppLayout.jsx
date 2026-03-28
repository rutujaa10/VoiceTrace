/**
 * App Layout — Floating glassmorphic sidebar + pill-style top actions
 *
 * Redesigned from the generic admin dashboard layout to a modern,
 * premium aesthetic with:
 * - Full-height glass sidebar (expanded by default)
 * - Floating pill buttons (user, theme toggle, logout)
 * - No full-width top navbar
 */

import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useApp, actionTypes } from '../state/AppContext';
import { useTheme } from '../state/ThemeContext';

export default function AppLayout() {
  const { state, dispatch } = useApp();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Redirect to login if no vendor
  if (!state.vendorId) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: '/app', icon: '📊', label: 'Dashboard' },
    { path: '/app/record', icon: '🎙️', label: 'Record' },
    { path: '/app/daily-log', icon: '📝', label: 'Daily Log' },
    { path: '/app/ledger', icon: '📒', label: 'Ledger' },
    { path: '/app/insights', icon: '💡', label: 'Insights' },
    { path: '/app/report', icon: '📊', label: 'Report' },
    { path: '/app/assistant', icon: '🤖', label: 'AI Assistant' },
  ];

  const handleLogout = () => {
    dispatch({ type: actionTypes.LOGOUT });
    navigate('/login', { replace: true });
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const vendorName = state.vendor?.name || state.dashboard?.vendor?.name || '';
  const loan = state.loanScore || {};

  return (
    <div className="app-layout">
      {/* Sidebar Overlay (mobile) */}
      {state.sidebarOpen && (
        <div
          className="sidebar-overlay visible"
          onClick={() => dispatch({ type: actionTypes.TOGGLE_SIDEBAR })}
        />
      )}

      {/* ═══ Floating Glass Sidebar ═══ */}
      <aside className={`app-sidebar ${state.sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="nav-logo">
          <span className="logo-icon">🎙️</span>
          <span className="gradient-text">VoiceTrace</span>
        </div>

        {/* Navigation Links */}
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
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer — Loan Score */}
        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-md)' }}>
          <div
            style={{
              background: 'rgba(34, 197, 94, 0.06)',
              border: '1px solid rgba(34, 197, 94, 0.12)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Loan Score
            </div>
            <div
              className="gradient-text"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.6rem',
                fontWeight: 800,
                lineHeight: 1.2,
              }}
            >
              {loan.score ?? '—'}/100
            </div>
            <div
              className={`badge ${loan.isLoanReady ? 'badge-success' : 'badge-warning'}`}
              style={{ marginTop: 8 }}
            >
              {loan.isLoanReady ? '✅ Loan Ready' : '🔄 Building...'}
            </div>
          </div>
        </div>
      </aside>

      {/* ═══ Floating Top Action Pills ═══ */}
      <div className="app-top-actions" id="app-top-actions">
        {/* Home */}
        <button
          id="btn-home"
          className="top-action-pill hide-mobile"
          onClick={handleGoHome}
          title="Go to Home Page"
        >
          🏠 Home
        </button>

        {/* Theme Toggle */}
        <button
          className="top-action-pill theme-toggle"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* User Pill */}
        {vendorName && (
          <div className="top-action-pill user-pill">
            <div className="top-action-avatar">
              {vendorName.charAt(0).toUpperCase()}
            </div>
            <span>{vendorName}</span>
          </div>
        )}

        {/* Logout */}
        <button
          id="btn-logout"
          className="top-action-pill danger"
          onClick={handleLogout}
          title="Logout"
        >
          🚪 Logout
        </button>

        {/* Mobile hamburger */}
        <button
          className="top-action-pill"
          onClick={() => dispatch({ type: actionTypes.TOGGLE_SIDEBAR })}
          aria-label="Toggle menu"
          style={{ display: 'none' }}
          id="mobile-menu-btn"
        >
          ☰
        </button>
      </div>

      {/* ═══ Main Content ═══ */}
      <main className="app-main">
        <Outlet />
      </main>

      {/* Mobile menu button — shown via CSS */}
      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
