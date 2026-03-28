/**
 * App Layout — Sidebar navigation + main content area
 */

import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useApp, actionTypes } from '../state/AppContext';

export default function AppLayout() {
  const { state, dispatch } = useApp();

  // Redirect to login if no vendor
  if (!state.vendorId) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: '/', icon: '📊', label: 'Dashboard' },
    { path: '/record', icon: '🎙️', label: 'Record' },
    { path: '/daily-log', icon: '📋', label: 'Daily Log' },
    { path: '/ledger', icon: '📒', label: 'Ledger' },
    { path: '/insights', icon: '💡', label: 'Insights' },
  ];

  return (
    <div className="app-layout">
      {/* Mobile Header */}
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
        <div style={{ width: 40 }} />
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
                  end={item.path === '/'}
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
