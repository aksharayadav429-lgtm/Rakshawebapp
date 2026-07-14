/**
 * Thin fetch wrapper for the RAKSHA backend API.
 * Change API_BASE if your backend runs on a different host/port.
 */
const API_BASE = 'http://localhost:4000/api';

async function apiRequest(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

const api = {
  register: (name, phone) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ name, phone }) }),
  login: (phone) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ phone }) }),

  createReport: (payload) => apiRequest('/reports', { method: 'POST', body: JSON.stringify(payload) }),
  getReports: (filters = {}) => {
    const q = new URLSearchParams(filters).toString();
    return apiRequest('/reports' + (q ? `?${q}` : ''));
  },
  getMyReports: (phone) => apiRequest(`/reports/mine/${encodeURIComponent(phone)}`),
  getStats: () => apiRequest('/reports/meta/stats'),
  assignTeam: (id, teamId) => apiRequest(`/reports/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ teamId }) }),
  resolveReport: (id) => apiRequest(`/reports/${id}/resolve`, { method: 'PATCH' }),

  getTeams: () => apiRequest('/teams'),
  getShelters: () => apiRequest('/shelters'),
  chat: (message, category) => apiRequest('/chat', { method: 'POST', body: JSON.stringify({ message, category }) }),
};
