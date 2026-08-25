import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  getAdminAnalyticsOverview,
  getAdminAnalyticsTrends,
  getAdminAnalyticsPolicies,
  getAdminAnalyticsConfidence
} from '../api/adminAnalytics';

export const useAdminAnalyticsOverview = (params) => {
  return useQuery({
    queryKey: ['adminAnalyticsOverview', params],
    queryFn: () => getAdminAnalyticsOverview(params),
    placeholderData: keepPreviousData,
  });
};

export const useAdminAnalyticsTrends = (params) => {
  return useQuery({
    queryKey: ['adminAnalyticsTrends', params],
    queryFn: () => getAdminAnalyticsTrends(params),
    placeholderData: keepPreviousData,
  });
};

export const useAdminAnalyticsPolicies = (params) => {
  return useQuery({
    queryKey: ['adminAnalyticsPolicies', params],
    queryFn: () => getAdminAnalyticsPolicies(params),
    placeholderData: keepPreviousData,
  });
};

export const useAdminAnalyticsConfidence = (params) => {
  return useQuery({
    queryKey: ['adminAnalyticsConfidence', params],
    queryFn: () => getAdminAnalyticsConfidence(params),
    placeholderData: keepPreviousData,
  });
};
