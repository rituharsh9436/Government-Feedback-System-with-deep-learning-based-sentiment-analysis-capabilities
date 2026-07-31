import { useAdmin } from '../hooks/useAdmin';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import toast from 'react-hot-toast';
import { ShieldCheck, UserX, RefreshCw, Users, CheckCircle2, Building2 } from 'lucide-react';

export const AdminPage = () => {
  const { requests, users, isLoading, isApproving, isDeleting, approve, deleteUser, refetch } = useAdmin();
  const isProcessing = isApproving || isDeleting;

  const handleDelete = (user) => {
    toast((t) => (
      <div className="flex flex-col">
        <p className="mb-3 text-sm font-medium text-slate-800">Are you sure you want to delete <b className="text-slate-900">{user.full_name}</b>'s account?</p>
        <div className="flex gap-2">
          <Button variant="danger" size="sm" onClick={() => {
            deleteUser(user.id);
            toast.dismiss(t.id);
          }}>Delete User</Button>
          <Button variant="outline" size="sm" onClick={() => toast.dismiss(t.id)}>Cancel</Button>
        </div>
      </div>
    ), { duration: 10000 });
  };

  const pendingIds = new Set(requests.map(u => u.id));
  const activeUsers = users.filter(u => !pendingIds.has(u.id));

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-primary-600" />
            Admin Dashboard
          </h2>
          <p className="text-slate-500 mt-2">Manage user accounts and government access requests.</p>
        </div>
        <Button variant="outline" onClick={refetch} disabled={isLoading || isProcessing} className="shrink-0 bg-white">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-500" />
            Pending Approvals
          </h3>
          <Badge variant="warning">{requests.length} Requests</Badge>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <ShieldCheck className="w-12 h-12 text-slate-200 mb-3" />
              <p>No pending requests.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {requests.map((user) => (
                <li className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors" key={user.id}>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900 text-lg">{user.full_name}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <p className="text-sm font-medium text-slate-700">
                        {user.department_name} <span className="text-slate-400 font-normal">({user.department_id})</span>
                      </p>
                    </div>
                  </div>
                  <Button disabled={isProcessing} onClick={() => approve(user.id)} className="shrink-0">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve Request
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            Active Users
          </h3>
          <Badge variant="primary">{activeUsers.length} Users</Badge>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {activeUsers.map((user) => (
              <li className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors" key={user.id}>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-slate-900">{user.full_name}</p>
                    <Badge variant={user.role === 'admin' ? 'primary' : user.role === 'govt' ? 'success' : 'default'} className="uppercase text-[10px]">
                      {user.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  
                  {user.department_name && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-xs font-medium text-slate-600">
                        {user.department_name} <span className="text-slate-400 font-normal">({user.department_id})</span>
                      </p>
                    </div>
                  )}
                </div>
                
                {user.role !== 'admin' && (
                  <Button variant="ghost" size="icon" disabled={isProcessing} onClick={() => handleDelete(user)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0">
                    <UserX className="w-5 h-5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};
