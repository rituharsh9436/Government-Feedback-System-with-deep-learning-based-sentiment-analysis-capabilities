import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';

export const Layout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="main-content">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <span className="text-primary-600 font-bold tracking-wider text-xs uppercase mb-1 block">
            Public Voice
          </span>
          <h1 className="text-2xl font-display font-bold m-0 text-slate-900">
            <Link to="/" className="text-slate-900 hover:text-primary-600">Policy Forum</Link>
          </h1>
        </div>
        
        {user ? (
          <div className="flex items-center gap-6">
            {user.role === 'admin' && (
              <Link to="/admin" className="font-medium text-slate-600 hover:text-primary-600">
                Admin Dashboard
              </Link>
            )}
            <div className="text-right">
              <p className="text-sm">Signed in as <b className="font-semibold">{user.full_name}</b></p>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                {user.role}
              </span>
            </div>
            <Button variant="outline" onClick={logout}>Sign out</Button>
          </div>
        ) : (
          <div className="flex gap-4">
            <Link to="/login"><Button variant="outline">Sign in</Button></Link>
          </div>
        )}
      </header>
      
      <main className="flex-1 container py-8">
        <Outlet />
      </main>
    </div>
  );
};
