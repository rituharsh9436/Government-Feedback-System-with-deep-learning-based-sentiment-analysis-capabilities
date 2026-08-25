import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from '../api/client';
import toast from 'react-hot-toast';
import { useState } from 'react';

export const useAdmin = () => {
  const queryClient = useQueryClient();
  const [reqPage, setReqPage] = useState(1);
  const [govtUsersPage, setGovtUsersPage] = useState(1);
  const [publicUsersPage, setPublicUsersPage] = useState(1);

  const { data: requestsData, isLoading: isRequestsLoading } = useQuery({
    queryKey: ['government-requests', reqPage],
    queryFn: () => request(`/auth/government-requests?page=${reqPage}&limit=10`),
  });

  const { data: govtUsersData, isLoading: isGovtUsersLoading } = useQuery({
    queryKey: ['users', 'govt', govtUsersPage],
    queryFn: () => request(`/auth/users?role=govt&page=${govtUsersPage}&limit=10`),
  });

  const { data: publicUsersData, isLoading: isPublicUsersLoading } = useQuery({
    queryKey: ['users', 'public', publicUsersPage],
    queryFn: () => request(`/auth/users?role=public&page=${publicUsersPage}&limit=10`),
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
    requestsPages: requestsData?.pages || 1,
    reqPage,
    setReqPage,
    
    govtUsers: govtUsersData?.items || [],
    govtUsersTotal: govtUsersData?.total || 0,
    govtUsersPages: govtUsersData?.pages || 1,
    govtUsersPage,
    setGovtUsersPage,
    
    publicUsers: publicUsersData?.items || [],
    publicUsersTotal: publicUsersData?.total || 0,
    publicUsersPages: publicUsersData?.pages || 1,
    publicUsersPage,
    setPublicUsersPage,
    
    isLoading: isRequestsLoading || isGovtUsersLoading || isPublicUsersLoading,
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
