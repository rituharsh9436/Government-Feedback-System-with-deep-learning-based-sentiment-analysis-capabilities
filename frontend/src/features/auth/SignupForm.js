import { useState, useEffect } from 'react';
import { useRequestOtp, useVerifyOtp } from '../../hooks/useAuthHooks';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { AlertCircle, Mail, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export const SignupForm = ({ onToggleMode, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'public',
    department_name: '',
    department_id: ''
  });
  
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const { mutate: requestOtp, isPending: isRequesting, error: requestError } = useRequestOtp();
  const { mutate: verifyOtp, isPending: isVerifying, error: verifyError } = useVerifyOtp();

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const update = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validatePassword = (password) => {
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
    if (!/\d/.test(password)) return "Password must contain at least one number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Password must contain at least one special character";
    return null;
  };

  const handleRequestOtp = (e) => {
    e.preventDefault();
    const pwdError = validatePassword(formData.password);
    if (pwdError) {
      toast.error(pwdError);
      return;
    }

    const payload = { ...formData };
    if (payload.role === 'public') {
      delete payload.department_name;
      delete payload.department_id;
    }
    
    requestOtp(payload, {
      onSuccess: () => {
        setStep(2);
        setCooldown(30);
        toast.success('Verification code sent to your email!');
      }
    });
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }
    
    verifyOtp({ email: formData.email, otp }, {
      onSuccess: () => {
        toast.success('Account created successfully!');
        onSuccess(formData.role);
      }
    });
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    
    const payload = { ...formData };
    if (payload.role === 'public') {
      delete payload.department_name;
      delete payload.department_id;
    }
    
    requestOtp(payload, {
      onSuccess: () => {
        setCooldown(30);
        toast.success('Verification code resent!');
      }
    });
  };

  const error = step === 1 ? requestError : verifyError;

  if (step === 2) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="text-center space-y-2 mb-6">
          <div className="mx-auto w-12 h-12 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Verify your email</h3>
          <p className="text-sm text-slate-500">
            We've sent a 6-digit code to <br />
            <span className="font-medium text-slate-900">{formData.email}</span>
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-100 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-800">{error.message}</p>
          </div>
        )}

        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5 text-center">Enter verification code</label>
            <Input 
              className="text-center text-2xl tracking-[0.5em] font-mono"
              required 
              maxLength="6"
              minLength="6"
              value={otp} 
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} 
              placeholder="••••••"
              autoFocus
            />
          </div>

          <Button type="submit" isLoading={isVerifying} className="w-full h-11 text-base">
            Verify and Create Account
            <CheckCircle2 className="w-4 h-4 ml-2" />
          </Button>
        </form>

        <div className="pt-4 text-center space-y-4">
          <div>
            <span className="text-sm text-slate-500">Didn't receive the code? </span>
            <button 
              type="button" 
              disabled={cooldown > 0 || isRequesting}
              className="text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={handleResend}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend now'}
            </button>
          </div>
          
          <button 
            type="button" 
            className="text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center justify-center mx-auto transition-colors" 
            onClick={() => setStep(1)}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-100 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-800">{error.message}</p>
        </div>
      )}
      
      <form onSubmit={handleRequestOtp} className="space-y-4">
        <Input 
          label="Full name" 
          required 
          minLength="2" 
          value={formData.full_name} 
          onChange={e => update('full_name', e.target.value)} 
          placeholder="John Doe"
        />
        
        <Input 
          label="Email address" 
          type="email" 
          required 
          value={formData.email} 
          onChange={e => update('email', e.target.value)} 
          placeholder="you@example.com"
        />
        
        <Input 
          label="Password" 
          type="password" 
          required 
          minLength="8" 
          title="Use at least 8 characters, including uppercase, lowercase, a number, and a special character."
          hint="At least 8 characters with uppercase, lowercase, a number, and a special character."
          value={formData.password} 
          onChange={e => update('password', e.target.value)} 
          placeholder="••••••••"
        />
        
        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-sm font-medium leading-none text-slate-700">Account type</label>
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" 
            value={formData.role} 
            onChange={e => update('role', e.target.value)}
          >
            <option value="public">Public</option>
            <option value="govt">Government (requires approval)</option>
          </select>
        </div>

        {formData.role === 'govt' && (
          <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-lg animate-in fade-in duration-200">
            <Input 
              label="Department name" 
              required 
              minLength="2" 
              maxLength="150" 
              value={formData.department_name} 
              onChange={e => update('department_name', e.target.value)} 
              placeholder="e.g. Ministry of Health"
            />
            <Input 
              label="Department ID" 
              required 
              minLength="2" 
              maxLength="50" 
              value={formData.department_id} 
              onChange={e => update('department_id', e.target.value)} 
              placeholder="e.g. MOH-12345"
            />
          </div>
        )}

        <div className="pt-2">
          <Button type="submit" isLoading={isRequesting} className="w-full">
            Continue
            {!isRequesting && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
        
        <div className="pt-4 text-center">
          <span className="text-sm text-slate-500">Already have an account? </span>
          <button 
            type="button" 
            className="text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors" 
            onClick={onToggleMode}
          >
            Sign in
          </button>
        </div>
      </form>
    </div>
  );
};
