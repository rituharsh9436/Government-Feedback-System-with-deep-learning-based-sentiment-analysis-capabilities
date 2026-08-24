import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from '../api/client';
import toast from 'react-hot-toast';
import { useState } from 'react';

export const useAdmin = () => {
  const queryClient = useQueryClient();
  const [reqPage, setReqPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);

  const { data: requestsData, isLoading: isRequestsLoading } = useQuery({
    queryKey: ['government-requests', reqPage],
    queryFn: () => request(`/auth/government-requests?page=${reqPage}&limit=10`),
  });

  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['users', usersPage],
    queryFn: () => request(`/auth/users?page=${usersPage}&limit=10`),
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
      queryClient.invalidateQueries({ queryKey: ['government-requests'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Error deleting user');
    }
  });

  return {
    requests: requestsData?.items || [],
    requestsTotal: requestsData?.total || 0,
    reqPage,
    setReqPage,
    users: usersData?.items || [],
    usersTotal: usersData?.total || 0,
    usersPage,
    setUsersPage,
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
