import { request } from './client';

const buildQueryString = (params) => {
  const query = new URLSearchParams();
  if (params.department) query.set('department', params.department);
  if (params.dateFrom) query.set('date_from', params.dateFrom);
  if (params.dateTo) query.set('date_to', params.dateTo);
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

export const getAdminAnalyticsOverview = async (params = {}) => {
  return request(`/admin/analytics/overview${buildQueryString(params)}`);
};

export const getAdminAnalyticsTrends = async (params = {}) => {
  return request(`/admin/analytics/trends${buildQueryString(params)}`);
};

export const getAdminAnalyticsPolicies = async (params = {}) => {
  return request(`/admin/analytics/policies${buildQueryString(params)}`);
};

export const getAdminAnalyticsConfidence = async (params = {}) => {
  return request(`/admin/analytics/confidence${buildQueryString(params)}`);
};

