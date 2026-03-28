/**
 * VoiceTrace — App Entry Point
 *
 * React Router setup with AppProvider wrapping.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './state/AppContext';
import AppLayout from './layouts/AppLayout';
import Dashboard from './views/Dashboard';
import Record from './views/Record';
import Ledger from './views/Ledger';
import Insights from './views/Insights';
import Login from './views/Login';
import DailyLogRecorder from './views/DailyLogRecorder';
import './index.css';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/record" element={<Record />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/daily-log" element={<DailyLogRecorder />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
