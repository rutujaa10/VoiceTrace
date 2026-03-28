/**
 * VoiceTrace — API Service Layer
 *
 * Axios-based service for all backend API calls.
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
    return api.post(`/ledger/${vendorId}/audio`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // audio processing can take time
    });
  },
  submitText: (vendorId, transcript, language = 'hi') =>
    api.post(`/ledger/${vendorId}/text`, { transcript, language }),
  getEntries: (vendorId, params = {}) =>
    api.get(`/ledger/${vendorId}`, { params }),
  getSummary: (vendorId, days = 30) =>
    api.get(`/ledger/${vendorId}/summary`, { params: { days } }),
  confirmEntry: (entryId, confirmed) =>
    api.put(`/ledger/entry/${entryId}/confirm`, { confirmed }),
  getToday: (vendorId) => api.get(`/ledger/${vendorId}/today`),
};

// ---- Insight APIs ----
export const insightAPI = {
  getAll: (vendorId, type = null) =>
    api.get(`/insights/${vendorId}`, { params: type ? { type } : {} }),
  getUnread: (vendorId) => api.get(`/insights/${vendorId}/unread`),
  getWeeklyStory: (vendorId) => api.get(`/insights/${vendorId}/weekly-story`),
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

export default api;
