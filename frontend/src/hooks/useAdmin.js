import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from '../api/client';
import toast from 'react-hot-toast';

export const useAdmin = () => {
  const queryClient = useQueryClient();

  const { data: requests, isLoading: isRequestsLoading } = useQuery({
    queryKey: ['government-requests'],
    queryFn: () => request('/auth/government-requests?page=1&limit=100'),
  });

  const { data: users, isLoading: isUsersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => request('/auth/users?page=1&limit=100'),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => request(`/auth/government-requests/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Request approved successfully');
      queryClient.invalidateQueries({ queryKey: ['government-requests'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Error approving request');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => request(`/auth/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Error deleting user');
    }
  });

  return {
    requests: requests?.items || [],
    users: users?.items || [],
    isLoading: isRequestsLoading || isUsersLoading,
    approve: approveMutation.mutate,
    isApproving: approveMutation.isPending,
    deleteUser: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['government-requests'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  };
};
