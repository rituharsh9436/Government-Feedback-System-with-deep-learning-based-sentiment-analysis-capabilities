import { useMutation } from '@tanstack/react-query';
import { authAPI } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export const useLogin = () => {
  const { login } = useAuth();
  return useMutation({
    mutationFn: ({ email, password }) => login(email, password),
  });
};

export const useRequestOtp = () => {
  return useMutation({
    mutationFn: (userData) => authAPI.requestOtp(userData),
  });
};

export const useVerifyOtp = () => {
  return useMutation({
    mutationFn: (verifyData) => authAPI.verifyOtp(verifyData),
  });
};
