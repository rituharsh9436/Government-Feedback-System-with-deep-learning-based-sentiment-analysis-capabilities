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
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <span className="text-primary-600 font-bold tracking-wider text-sm uppercase">Public Voice</span>
        <h1 className="text-4xl font-display font-bold mt-2">Smart Government Feedback</h1>
        <p className="text-muted mt-2 text-lg">Policies made clearer through public participation.</p>
      </div>

      <div className="w-full max-w-md">
        {message && <p className="notice notice-success text-center">{message}</p>}
        {mode === 'login' ? (
          <LoginForm onToggleMode={() => setMode('signup')} />
        ) : (
          <SignupForm onToggleMode={() => setMode('login')} onSuccess={handleSignupSuccess} />
        )}
      </div>
    </div>
  );
};
