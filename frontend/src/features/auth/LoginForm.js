import { useState } from 'react';
import { useLogin } from '../../hooks/useAuthHooks';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const LoginForm = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { mutate: login, isPending, error } = useLogin();

  const handleSubmit = (e) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <div className="auth-card">
      <h2>Welcome back</h2>
      {error && <p className="notice notice-error">{error.message}</p>}
      
      <form onSubmit={handleSubmit}>
        <Input 
          label="Email" 
          type="email" 
          required 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input 
          label="Password" 
          type="password" 
          required 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" isLoading={isPending} className="w-full mt-4">
          Sign in
        </Button>
        <button type="button" className="btn btn-outline w-full mt-4" onClick={onToggleMode}>
          New here? Register
        </button>
      </form>
    </div>
  );
};
