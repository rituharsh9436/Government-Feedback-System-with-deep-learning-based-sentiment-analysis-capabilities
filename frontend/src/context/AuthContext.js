import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authAPI } from '../api/auth';
import { ApiError } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('role')));
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('role');
        localStorage.removeItem('csrf_token');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    checkAuth();
    
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('role');
      localStorage.removeItem('csrf_token');
    };
    
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [checkAuth]);

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    setIsAuthenticated(true);
    await checkAuth(); // Fetch user details after login
    return data;
  };

  const logout = async () => {
    await authAPI.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, refreshUser: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
