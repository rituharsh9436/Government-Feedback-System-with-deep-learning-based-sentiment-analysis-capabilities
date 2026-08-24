import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { LogOut, LayoutDashboard, User, Settings } from 'lucide-react';

export const Layout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="sticky top-0 z-50 w-full border-b bg-white/75 backdrop-blur-md transition-all">
        <div className="container mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <div className="flex flex-col">
            <Link 
              to="/" 
              className="text-lg font-semibold tracking-tight hover:text-primary-600 transition-colors flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                SF
              </div>
              SmartGov
            </Link>
          </div>
          
          {user ? (
            <div className="flex items-center gap-6">
              {user.role === 'admin' && (
                <Link 
                  to="/admin" 
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              )}
              
              <Link 
                to="/settings" 
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>

              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 border border-slate-300">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
                <div className="flex flex-col hidden sm:flex">
                  <span className="text-sm font-medium leading-none">{user.full_name}</span>
                  <span className="text-xs text-slate-500 mt-1 capitalize">{user.role}</span>
                </div>
              </div>
              
              <Button variant="ghost" size="sm" onClick={logout} className="text-slate-600">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <Link to="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};
