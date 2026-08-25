import client from './client';

export const getAdminAnalyticsOverview = async (params = {}) => {
  const response = await client.get('/admin/analytics/overview', { params });
  return response.data;
};

export const getAdminAnalyticsTrends = async (params = {}) => {
  const response = await client.get('/admin/analytics/trends', { params });
  return response.data;
};

export const getAdminAnalyticsPolicies = async (params = {}) => {
  const response = await client.get('/admin/analytics/policies', { params });
  return response.data;
};

export const getAdminAnalyticsConfidence = async (params = {}) => {
  const response = await client.get('/admin/analytics/confidence', { params });
  return response.data;
};
