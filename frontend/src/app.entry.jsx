/**
 * VoiceTrace — App Entry Point
 *
 * React Router setup with AppProvider + ThemeProvider wrapping.
 * Landing page at "/" (public), app dashboard at "/app/*" (auth required).
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './state/AppContext';
import { ThemeProvider } from './state/ThemeContext';
import AppLayout from './layouts/AppLayout';
import Landing from './views/Landing';
import LandingNavbar from './components/landing/LandingNavbar';
import Dashboard from './views/Dashboard';
import Record from './views/Record';
import Ledger from './views/Ledger';
import Insights from './views/Insights';
import Assistant from './views/Assistant';
import Login from './views/Login';
import DailyLogRecorder from './views/DailyLogRecorder';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* Public landing page */}
            <Route
              path="/"
              element={
                <>
                  <LandingNavbar />
                  <Landing />
                </>
              }
            />

            {/* Auth */}
            <Route path="/login" element={<Login />} />

            {/* App dashboard (protected by AppLayout) */}
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="record" element={<Record />} />
              <Route path="daily-log" element={<DailyLogRecorder />} />
              <Route path="ledger" element={<Ledger />} />
              <Route path="insights" element={<Insights />} />
              <Route path="assistant" element={<Assistant />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
