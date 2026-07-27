import { useMutation } from '@tanstack/react-query';
import { authAPI } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export const useLogin = () => {
  const { login } = useAuth();
  return useMutation({
    mutationFn: ({ email, password }) => login(email, password),
  });
};

export const useSignup = () => {
  return useMutation({
    mutationFn: (userData) => authAPI.signup(userData),
  });
};
