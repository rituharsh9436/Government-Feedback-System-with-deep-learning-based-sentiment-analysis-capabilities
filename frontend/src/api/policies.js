import { request } from './client';

export const policiesAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', filters.page);
    if (filters.limit) params.set('limit', filters.limit);
    if (filters.sortDate) params.set('sort_date', filters.sortDate);
    if (filters.sortName) params.set('sort_name', filters.sortName);
    if (filters.sortPopularity) params.set('sort_popularity', filters.sortPopularity);
    if (filters.department) {
      if (Array.isArray(filters.department)) {
        if (filters.department.length > 0) params.set('department', filters.department.join(','));
      } else {
        params.set('department', filters.department);
      }
    }
    if (filters.keyword?.trim()) params.set('keyword', filters.keyword.trim());
    if (filters.recent) params.set('recent', 'true');
    if (filters.dateFrom) params.set('date_from', `${filters.dateFrom}T00:00:00Z`);
    if (filters.dateTo) params.set('date_to', `${filters.dateTo}T23:59:59Z`);
    
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
