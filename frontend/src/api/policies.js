import { request } from './client';

export const policiesAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.keyword?.trim()) params.set('keyword', filters.keyword.trim());
    if (filters.recent) params.set('recent', 'true');
    if (filters.dateFrom) params.set('date_from', `${filters.dateFrom}T00:00:00`);
    if (filters.dateTo) params.set('date_to', `${filters.dateTo}T23:59:59`);
    
    return request(`/posts/?${params}`);
  },

  getById: async (id) => {
    return request(`/posts/${id}`);
  },

  create: async (policyData) => {
    return request('/posts/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policyData),
    });
  },

  delete: async (id) => {
    return request(`/posts/${id}`, { method: 'DELETE' });
  },

  addComment: async (id, content) => {
    return request(`/posts/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  },

  getSentimentAnalysis: async (id) => {
    return request(`/posts/${id}/sentiment`);
  },

  getOverallAnalysis: async () => {
    return request('/posts/analytics/overall-sentiment');
  },
};
