/**
 * App Layout — Top navbar + Sidebar navigation + main content area
 */

import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useApp, actionTypes } from '../state/AppContext';

export default function AppLayout() {
  const { state, dispatch } = useApp();
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
            ☰
          </button>
          <NavLink to="/app" className="topbar-brand">
            <span className="topbar-logo">🎙️</span>
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
            🏠 <span className="topbar-btn-label">Home</span>
          </button>

          {vendorName && (
            <div className="topbar-user">
              <div className="topbar-avatar">
                {vendorName.charAt(0).toUpperCase()}
              </div>
              <span className="topbar-username">{vendorName}</span>
            </div>
          )}

          <button
            id="btn-logout"
            className="topbar-btn topbar-btn-danger"
            onClick={handleLogout}
            title="Logout"
          >
            🚪 <span className="topbar-btn-label">Logout</span>
          </button>
        </div>
      </header>

      {/* Mobile Header (legacy — hidden on desktop, shown on narrow devices) */}
      <header className="mobile-header">
        <button
          className="hamburger"
          onClick={() => dispatch({ type: actionTypes.TOGGLE_SIDEBAR })}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          🎙️ VoiceTrace
        </span>
        <button
          className="hamburger"
          onClick={handleLogout}
          aria-label="Logout"
          style={{ fontSize: '1.2rem' }}
        >
          🚪
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
          <span className="logo-icon">🎙️</span>
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
                  <span className="nav-icon">{item.icon}</span>
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
              style={{ marginTop: 8 }}
            >
              {state.loanScore?.isLoanReady ? '✅ Loan Ready' : '🔄 Building...'}
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
