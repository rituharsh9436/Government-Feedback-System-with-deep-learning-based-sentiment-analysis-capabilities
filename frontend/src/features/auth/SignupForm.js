import { useState } from 'react';
import { useSignup } from '../../hooks/useAuthHooks';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const SignupForm = ({ onToggleMode, onSuccess }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'public',
    aadhaar_number: '',
    contact_number: '',
    department_name: '',
    department_id: ''
  });

  const { mutate: signup, isPending, error } = useSignup();

  const update = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (payload.role === 'public') {
      delete payload.department_name;
      delete payload.department_id;
    } else {
      delete payload.aadhaar_number;
    }
    
    signup(payload, {
      onSuccess: () => {
        onSuccess(payload.role);
      }
    });
  };

  return (
    <div className="auth-card">
      <h2>Create an account</h2>
      {error && <p className="notice notice-error">{error.message}</p>}
      
      <form onSubmit={handleSubmit}>
        <Input label="Full name" required minLength="2" value={formData.full_name} onChange={e => update('full_name', e.target.value)} />
        <Input label="Email" type="email" required value={formData.email} onChange={e => update('email', e.target.value)} />
        <Input label="Password" type="password" required minLength="8" value={formData.password} onChange={e => update('password', e.target.value)} />
        
        <div className="form-group">
          <label className="form-label">Account type</label>
          <select className="form-input" value={formData.role} onChange={e => update('role', e.target.value)}>
            <option value="public">Public</option>
            <option value="govt">Government (requires approval)</option>
          </select>
        </div>

        {formData.role === 'public' && (
          <Input label="Aadhaar number" required pattern="[0-9]{12}" title="12 digits" value={formData.aadhaar_number} onChange={e => update('aadhaar_number', e.target.value)} />
        )}
        
        <Input label="Contact number" required pattern="\+?[1-9][0-9]{7,14}" value={formData.contact_number} onChange={e => update('contact_number', e.target.value)} />

        {formData.role === 'govt' && (
          <>
            <Input label="Department name" required minLength="2" maxLength="150" value={formData.department_name} onChange={e => update('department_name', e.target.value)} />
            <Input label="Department ID" required minLength="2" maxLength="50" value={formData.department_id} onChange={e => update('department_id', e.target.value)} />
          </>
        )}

        <Button type="submit" isLoading={isPending} className="w-full mt-4">
          Create account
        </Button>
        <button type="button" className="btn btn-outline w-full mt-4" onClick={onToggleMode}>
          Back to sign in
        </button>
      </form>
    </div>
  );
};
