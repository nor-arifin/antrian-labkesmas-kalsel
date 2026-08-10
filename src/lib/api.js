const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  takeQueue: (serviceId, priority = 0) =>
    request('/queue/take', { method: 'POST', body: JSON.stringify({ serviceId, priority }) }),

  getNext: (counterId) => request(`/queue/next/${counterId}`),

  updateStatus: (id, status) =>
    request(`/queue/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  getActive: () => request('/queue/active'),
  getStats: () => request('/queue/stats'),
  getHistory: (counterId) => request(`/queue/history/${counterId}`),

  getServices: () => request('/service'),
  createService: (data) =>
    request('/service', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id, data) =>
    request(`/service/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteService: (id) => request(`/service/${id}`, { method: 'DELETE' }),

  getCounters: () => request('/counter'),
  createCounter: (data) =>
    request('/counter', { method: 'POST', body: JSON.stringify(data) }),
  updateCounter: (id, data) =>
    request(`/counter/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCounter: (id) => request(`/counter/${id}`, { method: 'DELETE' }),
  toggleBreak: (counterId) => request(`/counter/${counterId}/break`, { method: 'PUT' }),

  printTicket: (queueId) =>
    request('/print/ticket', { method: 'POST', body: JSON.stringify({ queueId }) }),

  getReportDaily: (date) => request(`/report/daily?date=${date}`),
  getReportWeekly: (start, end) => request(`/report/weekly?start=${start}&end=${end}`),
  getReportMonthly: (month, year) => request(`/report/monthly?month=${month}&year=${year}`),

  reset: () => request('/reset', { method: 'POST' }),

  getSettings: () => request('/settings'),
  updateSetting: (key, value) =>
    request('/settings', { method: 'PUT', body: JSON.stringify({ key, value }) }),
};
