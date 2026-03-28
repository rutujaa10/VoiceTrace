/**
 * VoiceTrace — API Service Layer (Enhanced)
 *
 * Axios-based service for all backend API calls.
 * New endpoints for:
 *  - Phase 2: Stock suggestions via weekly analytics
 *  - Phase 4: Pending clarifications, resolve clarification
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---- Vendor APIs ----
export const vendorAPI = {
  register: (data) => api.post('/vendors/register', data),
  login: (phone) => api.post('/vendors/login', { phone }),
  get: (id) => api.get(`/vendors/${id}`),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  getLoanScore: (id) => api.get(`/vendors/${id}/loan-score`),
  getDashboard: (id) => api.get(`/vendors/${id}/dashboard`),
};

// ---- Ledger APIs ----
export const ledgerAPI = {
  uploadAudio: (vendorId, audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    return api.post(`/ledger/${vendorId}/audio?save=false`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
  submitText: (vendorId, transcript, language = 'hi') =>
    api.post(`/ledger/${vendorId}/text`, { transcript, language }),
  extractOnly: (vendorId, transcript, language = 'hi') =>
    api.post(`/ledger/${vendorId}/extract-only`, { transcript, language }),
  getEntries: (vendorId, params = {}) =>
    api.get(`/ledger/${vendorId}`, { params }),
  getSummary: (vendorId, days = 30) =>
    api.get(`/ledger/${vendorId}/summary`, { params: { days } }),
  confirmEntry: (entryId, confirmed) =>
    api.put(`/ledger/entry/${entryId}/confirm`, { confirmed }),
  getToday: (vendorId) => api.get(`/ledger/${vendorId}/today`),
  manualEntry: (vendorId, data) =>
    api.post(`/ledger/${vendorId}/manual`, data),

  // Phase 4 Feature 6: Clarification flow
  getPendingClarifications: (vendorId) =>
    api.get(`/ledger/${vendorId}/pending-clarifications`),
  resolveClarification: (entryId, data) =>
    api.put(`/ledger/entry/${entryId}/clarify`, data),
  removeItem: (entryId, itemId) =>
    api.delete(`/ledger/entry/${entryId}/item/${itemId}`),
  removeExpense: (entryId, expenseId) =>
    api.delete(`/ledger/entry/${entryId}/expense/${expenseId}`),
};

// ---- Insight APIs ----
export const insightAPI = {
  getAll: (vendorId, type = null) =>
    api.get(`/insights/${vendorId}`, { params: type ? { type } : {} }),
  getUnread: (vendorId) => api.get(`/insights/${vendorId}/unread`),
  getWeeklyStory: (vendorId) => api.get(`/insights/${vendorId}/weekly-story`),
  getSmartInsights: (vendorId) => api.get(`/insights/${vendorId}/smart`, { timeout: 45000 }),
  getWeatherForecast: (lat, lng) =>
    api.get('/insights/weather/forecast', { params: { lat, lng } }),
  getCSI: (lat, lng, radius = 2000) =>
    api.get('/insights/csi/area', { params: { lat, lng, radius } }),
  markRead: (insightId) => api.put(`/insights/${insightId}/read`),
};

// ---- PDF APIs ----
export const pdfAPI = {
  downloadEarnings: (vendorId, days = 30) =>
    api.get(`/pdf/${vendorId}/earnings`, {
      params: { days },
      responseType: 'blob',
    }),
};

// ---- Analytics APIs ----
export const analyticsAPI = {
  getWeekly: (vendorId) => api.get(`/analytics/weekly/${vendorId}`),
};

// ---- Assistant APIs ----
export const assistantAPI = {
  chat: (vendorId, message) =>
    api.post('/assistant/chat', { vendorId, message }),
};

export default api;
