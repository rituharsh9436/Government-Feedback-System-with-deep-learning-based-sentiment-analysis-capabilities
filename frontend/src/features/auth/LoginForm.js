import { useState } from 'react';
import { useLogin } from '../../hooks/useAuthHooks';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { AlertCircle } from 'lucide-react';

export const LoginForm = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { mutate: login, isPending, error } = useLogin();

  const handleSubmit = (e) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-100 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-800">{error.message}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          label="Email address" 
          type="email" 
          required 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Input 
          label="Password" 
          type="password" 
          required 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        
        <div className="pt-2">
          <Button type="submit" isLoading={isPending} className="w-full">
            Sign in
          </Button>
        </div>
        
        <div className="pt-4 text-center">
          <span className="text-sm text-slate-500">Don't have an account? </span>
          <button 
            type="button" 
            className="text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors" 
            onClick={onToggleMode}
          >
            Sign up
          </button>
        </div>
      </form>
    </div>
  );
};
