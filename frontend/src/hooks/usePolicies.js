import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policiesAPI } from '../api/policies';

export const usePolicies = (filters) => {
  return useQuery({
    queryKey: ['policies', filters],
    queryFn: () => policiesAPI.getAll(filters),
    keepPreviousData: true,
  });
};

export const useCreatePolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: policiesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
};

export const useDeletePolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: policiesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }) => policiesAPI.addComment(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
};

export const usePolicyAnalysis = (id) => {
  return useQuery({
    queryKey: ['policy-analysis', id],
    queryFn: () => policiesAPI.getSentimentAnalysis(id),
    enabled: !!id,
  });
};

export const useOverallAnalysis = (options = {}) => {
  return useQuery({
    queryKey: ['overall-analysis'],
    queryFn: policiesAPI.getOverallAnalysis,
    ...options
  });
};
