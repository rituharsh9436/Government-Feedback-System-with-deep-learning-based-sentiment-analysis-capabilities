import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { LogOut, LayoutDashboard, User, Settings, MessageSquare, LineChart } from 'lucide-react';

export const Layout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-white/80 backdrop-blur-md shadow-sm transition-all">
        <div className="container mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <div className="flex flex-col">
            <Link 
              to="/" 
              className="text-lg font-bold tracking-tight text-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm">
                SF
              </div>
              SmartGov
            </Link>
          </div>
          
          {user ? (
            <div className="flex items-center gap-6">
              <Link 
                to="/" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Policies & Comments
              </Link>

              {user.role === 'admin' && (
                <>
                  <Link 
                    to="/admin" 
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Admin
                  </Link>
                  <Link 
                    to="/admin/analytics" 
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                  >
                    <LineChart className="w-4 h-4" />
                    Analytics
                  </Link>
                </>
              )}
              
              <Link 
                to="/settings" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
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
              <Link to="/login">
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
