import { request } from './client';

export const authAPI = {
  login: async (email, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password }),
    });
    localStorage.setItem('role', data.role);
    if (data.csrf_token) {
      localStorage.setItem('csrf_token', data.csrf_token);
    }
    return data;
  },

  signup: async (userData) => {
    return request('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
  },

  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('role');
      localStorage.removeItem('csrf_token');
    }
  },

  getCurrentUser: async () => {
    return request('/auth/me');
  },
};
