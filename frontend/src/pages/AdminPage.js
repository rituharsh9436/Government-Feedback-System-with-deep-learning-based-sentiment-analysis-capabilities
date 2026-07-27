import { useState, useEffect } from 'react';
import { request } from '../api/client';
import { Button } from '../components/common/Button';

export const AdminPage = () => {
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const [pending, managed] = await Promise.all([
        request('/auth/government-requests'),
        request('/auth/users')
      ]);
      setRequests(pending);
      setUsers(managed);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const approve = async (id) => {
    setIsProcessing(true);
    try {
      await request(`/auth/government-requests/${id}/approve`, { method: 'POST' });
      await loadAccounts();
    } catch (e) {
      alert(e.message || 'Error approving request');
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.full_name}'s account?`)) return;
    setIsProcessing(true);
    try {
      await request(`/auth/users/${user.id}`, { method: 'DELETE' });
      await loadAccounts();
    } catch (e) {
      alert(e.message || 'Error deleting user');
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingIds = new Set(requests.map(u => u.id));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-bold font-display">Account Management</h2>
          <p className="text-muted mt-2">Approve government requests and manage users.</p>
        </div>
        <Button variant="outline" onClick={loadAccounts} disabled={isLoading || isProcessing}>
          {isLoading ? 'Loading...' : 'Refresh Data'}
        </Button>
      </div>

      <section className="mb-10">
        <h3 className="text-xl font-semibold mb-4 text-slate-800">Pending Approvals</h3>
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="card text-center text-slate-500 py-8">No pending requests.</div>
          ) : (
            requests.map((user) => (
              <div className="card flex justify-between items-center bg-warning/5 border-warning/20" key={user.id}>
                <div>
                  <p className="font-bold">{user.full_name}</p>
                  <p className="text-sm text-slate-600">{user.email}</p>
                  <p className="text-sm font-medium mt-1 text-slate-800">
                    {user.department_name} ({user.department_id})
                  </p>
                </div>
                <Button disabled={isProcessing} onClick={() => approve(user.id)}>
                  Approve Request
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-4 text-slate-800">All Users</h3>
        <div className="space-y-4">
          {users.filter(u => !pendingIds.has(u.id)).map((user) => (
            <div className="card flex justify-between items-center" key={user.id}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold">{user.full_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-primary-100 text-primary-700' : user.role === 'govt' ? 'bg-success/20 text-success' : 'bg-slate-200 text-slate-700'}`}>
                    {user.role}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{user.email}</p>
                {user.department_name && (
                  <p className="text-sm font-medium mt-1 text-slate-800">
                    {user.department_name} ({user.department_id})
                  </p>
                )}
              </div>
              <Button variant="danger" disabled={isProcessing} onClick={() => deleteUser(user)}>
                Delete Account
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
