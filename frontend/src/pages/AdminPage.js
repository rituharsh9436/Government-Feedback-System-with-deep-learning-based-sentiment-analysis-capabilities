import { useAdmin } from '../hooks/useAdmin';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import toast from 'react-hot-toast';
import { ShieldCheck, UserX, RefreshCw, Users, CheckCircle2, Building2, Server, DatabaseZap, LineChart } from 'lucide-react';
import { policiesAPI } from '../api/policies';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const AdminPage = () => {
  const { requests, requestsTotal, requestsPages, reqPage, setReqPage, govtUsers, govtUsersTotal, govtUsersPages, govtUsersPage, setGovtUsersPage, publicUsers, publicUsersTotal, publicUsersPages, publicUsersPage, setPublicUsersPage, isLoading, isApproving, isDeleting, approve, deleteUser, refetch } = useAdmin();
  const isProcessing = isApproving || isDeleting;
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [userListTab, setUserListTab] = useState('govt');
  const navigate = useNavigate();

  const availableTabs = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'actions', label: 'System Actions', icon: Server }
  ];

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      await policiesAPI.reanalyzeComments();
      toast.success("Background re-analysis of existing comments started. Please check server logs for progress.", { duration: 5000 });
    } catch (err) {
      toast.error(err.message || "Failed to start re-analysis");
    } finally {
      setIsReanalyzing(false);
    }
  };

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
  const activeGovtUsers = govtUsers.filter(u => !pendingIds.has(u.id));
  const activePublicUsers = publicUsers.filter(u => !pendingIds.has(u.id));
  
  const currentUsers = userListTab === 'govt' ? activeGovtUsers : activePublicUsers;
  const currentTotal = userListTab === 'govt' ? govtUsersTotal : publicUsersTotal;
  const currentPage = userListTab === 'govt' ? govtUsersPage : publicUsersPage;
  const setPage = userListTab === 'govt' ? setGovtUsersPage : setPublicUsersPage;

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

      <div className="flex space-x-1 bg-slate-100/80 p-1 rounded-lg">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" disabled={isProcessing} onClick={() => handleDelete(user)} className="text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200">
                      <UserX className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button disabled={isProcessing} onClick={() => approve(user.id)}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve Request
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {requestsTotal > 10 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50">
              <Button variant="outline" size="sm" onClick={() => setReqPage(p => Math.max(1, p - 1))} disabled={reqPage === 1 || isProcessing}>Previous</Button>
              <span className="text-sm text-slate-500">Page {reqPage} of {requestsPages}</span>
              <Button variant="outline" size="sm" onClick={() => setReqPage(p => p + 1)} disabled={reqPage >= requestsPages || isProcessing}>Next</Button>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            Active Users
          </h3>
          <Badge variant="primary">{currentTotal} Accounts</Badge>
        </div>

        <div className="flex space-x-1 bg-slate-100/80 p-1 rounded-lg w-full max-w-sm">
          <button
            onClick={() => setUserListTab('govt')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              userListTab === 'govt'
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Government
          </button>
          <button
            onClick={() => setUserListTab('public')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              userListTab === 'public'
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Public
          </button>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {currentUsers.map((user) => (
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
          {currentTotal > 10 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isProcessing}>Previous</Button>
              <span className="text-sm text-slate-500">Page {currentPage} of {userListTab === 'govt' ? govtUsersPages : publicUsersPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={currentPage >= (userListTab === 'govt' ? govtUsersPages : publicUsersPages) || isProcessing}>Next</Button>
            </div>
          )}
        </div>
      </section>
      </div>
      )}

      {activeTab === 'actions' && (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-500" />
            System Actions
          </h3>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-slate-900">Re-Analyze Old Comments</h4>
              <p className="text-sm text-slate-500 mt-1">Triggers a background task to process comments that were added before the ML service was active or failed analysis.</p>
            </div>
            <Button variant="outline" onClick={handleReanalyze} disabled={isReanalyzing || isProcessing} className="shrink-0">
              <DatabaseZap className={`w-4 h-4 mr-2 ${isReanalyzing ? 'animate-pulse' : ''}`} />
              {isReanalyzing ? 'Starting...' : 'Trigger Analysis'}
            </Button>
          </div>
          
          <hr className="my-6 border-slate-100" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-slate-900">Sentiment Analytics Dashboard</h4>
              <p className="text-sm text-slate-500 mt-1">View comprehensive analysis of public sentiment across all departments and policies.</p>
            </div>
            <Button onClick={() => navigate('/admin/analytics')} className="shrink-0">
              <LineChart className="w-4 h-4 mr-2" />
              Open Dashboard
            </Button>
          </div>
        </div>
      </section>
      </div>
      )}
    </div>
  );
};
