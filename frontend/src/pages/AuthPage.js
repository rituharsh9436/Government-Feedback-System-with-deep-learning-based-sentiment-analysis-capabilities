import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from '../features/auth/LoginForm';
import { SignupForm } from '../features/auth/SignupForm';

export const AuthPage = () => {
  const [mode, setMode] = useState('login');
  const [message, setMessage] = useState('');
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSignupSuccess = (role) => {
    setMode('login');
    setMessage(
      role === 'govt' 
        ? 'Request submitted for admin approval.' 
        : 'Account created. Please sign in.'
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-md flex items-center justify-center">
            <span className="text-white font-bold text-xl">SF</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {mode === 'login' 
              ? 'Enter your credentials to access your account' 
              : 'Join the Smart Government Feedback platform'}
          </p>
        </div>
        
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-soft sm:rounded-2xl sm:px-10 border border-slate-100">
            {message && (
              <div className="mb-4 rounded-md bg-emerald-50 p-4 border border-emerald-100">
                <p className="text-sm font-medium text-emerald-800">{message}</p>
              </div>
            )}
            
            {mode === 'login' ? (
              <LoginForm onToggleMode={() => setMode('signup')} />
            ) : (
              <SignupForm onToggleMode={() => setMode('login')} onSuccess={handleSignupSuccess} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
