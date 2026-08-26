import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from '../features/auth/LoginForm';
import { SignupForm } from '../features/auth/SignupForm';
import { MessageSquare, Shield, Activity } from 'lucide-react';

export const AuthPage = () => {
  const [mode, setMode] = useState('login');
  const [message, setMessage] = useState('');
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <div className="flex min-h-screen bg-slate-50 relative overflow-hidden selection:bg-slate-800 selection:text-white">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none hidden lg:block">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-slate-400/20 blur-[120px] mix-blend-multiply animate-blob"></div>
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[120px] mix-blend-multiply animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-violet-400/20 blur-[120px] mix-blend-multiply animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="flex w-full flex-col lg:flex-row z-10">
        {/* Left Side - Hero / Branding */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 lg:p-24 relative overflow-hidden bg-slate-900 text-white shadow-2xl">
          {/* subtle mesh overlay inside the dark side */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 opacity-90 z-0"></div>
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-slate-600/20 blur-[100px] rounded-full z-0 pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 shadow-xl shadow-slate-900/50 border border-slate-700">
              <span className="text-white font-bold text-2xl tracking-tighter">SF</span>
            </div>
            <span className="text-xl font-bold tracking-tight">SmartGov</span>
          </div>
          
          <div className={`relative z-10 space-y-6 transition-all duration-1000 ease-out transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80 backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
              Platform is live
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Smart Policy Feedback & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">Sentiment Analysis</span>.
            </h1>
            <p className="text-lg text-slate-300 max-w-lg font-medium">
              Connecting citizens and policymakers. Share feedback on active policies and help the government make data-driven decisions through AI-powered sentiment analysis.
            </p>
            
            {/* Feature Pills */}
            <div className="pt-8 flex flex-wrap gap-4">
               <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 backdrop-blur-md">
                 <MessageSquare className="w-4 h-4 text-slate-300" />
                 <span className="text-sm font-medium">Policy Feedback</span>
               </div>
               <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 backdrop-blur-md">
                 <Activity className="w-4 h-4 text-blue-400" />
                 <span className="text-sm font-medium">AI Sentiment Analysis</span>
               </div>
               <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 backdrop-blur-md">
                 <Shield className="w-4 h-4 text-violet-400" />
                 <span className="text-sm font-medium">Data-driven Decisions</span>
               </div>
            </div>
          </div>
          
          <div className="relative z-10 flex items-center justify-between text-sm text-slate-400">
            <p>© {new Date().getFullYear()} SmartGov. All rights reserved.</p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex w-full lg:w-1/2 flex-col justify-center items-center p-6 sm:p-12 bg-white/50 backdrop-blur-3xl">
          {/* Mobile Branding */}
          <div className="lg:hidden flex items-center gap-3 mb-10 mt-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-md">
              <span className="text-white font-bold text-xl tracking-tighter">SF</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">SmartGov</span>
          </div>

          <div className={`w-full max-w-md transition-all duration-700 delay-300 ease-out transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                {mode === 'login' ? 'Welcome back' : 'Create an account'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {mode === 'login' 
                  ? 'Enter your credentials to access your account' 
                  : 'Join the Smart Government Feedback platform'}
              </p>
            </div>
            
            <div className="bg-white py-8 px-4 sm:px-10 shadow-soft sm:rounded-3xl border border-slate-100">
              {message && (
                <div className="mb-6 rounded-xl bg-emerald-50 p-4 border border-emerald-100 flex items-start gap-3 animate-fade-in">
                  <div className="mt-0.5">
                    <Shield className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-emerald-800">{message}</p>
                </div>
              )}
              
              {mode === 'login' ? (
                <LoginForm onToggleMode={() => setMode('signup')} />
              ) : (
                <SignupForm onToggleMode={() => setMode('login')} onSuccess={handleSignupSuccess} />
              )}
            </div>
            
            <p className="mt-8 text-center text-xs text-slate-400">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
