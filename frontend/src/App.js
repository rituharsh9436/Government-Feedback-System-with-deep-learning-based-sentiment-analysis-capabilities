import { useCallback, useEffect, useState } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const EMPTY_POLICY = { title: '', description: '', category: '', location: '' };

class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function request(path, options = {}, token = '') {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.detail || 'Something went wrong', response.status);
  return data;
}

function PolicyForm({ initialPolicy, onSave, saving, onCancel }) {
  const [form, setForm] = useState(initialPolicy || EMPTY_POLICY);
  useEffect(() => setForm(initialPolicy || EMPTY_POLICY), [initialPolicy]);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event) => { event.preventDefault(); onSave(form); };

  return <form className="policy-form" onSubmit={submit}>
    {['title', 'category', 'location'].map((field) => <label key={field}>{field}
      <input required value={form[field]} onChange={(event) => update(field, event.target.value)} />
    </label>)}
    <label className="wide">Description
      <textarea required minLength="10" value={form.description} onChange={(event) => update('description', event.target.value)} />
    </label>
    <div className="form-actions wide">
      <button disabled={saving}>{saving ? 'Saving…' : initialPolicy ? 'Save changes' : 'Publish policy'}</button>
      {onCancel && <button className="outline" type="button" onClick={onCancel} disabled={saving}>Cancel</button>}
    </div>
  </form>;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(token));
  const [mode, setMode] = useState('login');
  const [message, setMessage] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [filters, setFilters] = useState({ keyword: '', recent: false, sort: 'newest', dateFrom: '', dateTo: '' });
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [repostSource, setRepostSource] = useState(null);
  const [overallAnalysis, setOverallAnalysis] = useState(null);
  const [policyAnalysis, setPolicyAnalysis] = useState({});
  const [busy, setBusy] = useState({});

  const notify = useCallback((text, type = 'success') => setMessage({ text, type }), []);
  useEffect(() => {
    if (!message) return undefined;
    const timeout = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const logout = useCallback((notice = 'Signed out.') => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(''); setCurrentUser(null); setAuthLoading(false);
    if (notice) notify(notice, 'success');
  }, [notify]);

  const authenticatedRequest = useCallback(async (path, options = {}) => {
    try { return await request(path, options, token); }
    catch (error) {
      if (error.status === 401) logout('Your session expired. Please sign in again.');
      throw error;
    }
  }, [logout, token]);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    setAuthLoading(true);
    request('/auth/me', {}, token)
      .then((user) => { if (active) setCurrentUser(user); })
      .catch((error) => {
        if (active) {
          localStorage.removeItem('token'); localStorage.removeItem('role');
          setToken(''); setCurrentUser(null);
          notify(error.status === 401 ? 'Your session expired. Please sign in again.' : error.message, 'error');
        }
      })
      .finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, [token, notify]);

  useEffect(() => {
    const controller = new AbortController();
    const debounce = window.setTimeout(async () => {
      const params = new URLSearchParams({ sort: filters.sort });
      if (filters.keyword.trim()) params.set('keyword', filters.keyword.trim());
      if (filters.recent) params.set('recent', 'true');
      if (filters.dateFrom) params.set('date_from', `${filters.dateFrom}T00:00:00`);
      if (filters.dateTo) params.set('date_to', `${filters.dateTo}T23:59:59`);
      setPoliciesLoading(true);
      try { setPolicies(await request(`/posts/?${params}`, { signal: controller.signal })); }
      catch (error) { if (error.name !== 'AbortError') notify(error.message, 'error'); }
      finally { if (!controller.signal.aborted) setPoliciesLoading(false); }
    }, 350);
    return () => { controller.abort(); window.clearTimeout(debounce); };
  }, [filters, notify]);

  const run = async (key, action) => {
    setBusy((items) => ({ ...items, [key]: true }));
    try { await action(); }
    catch (error) { if (error.status !== 401) notify(error.message, 'error'); }
    finally { setBusy((items) => ({ ...items, [key]: false })); }
  };
  const reloadPolicies = () => setFilters((value) => ({ ...value }));

  const login = (event) => run('login', async () => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const result = await request('/auth/login', { method: 'POST', body: new URLSearchParams({ username: form.get('email'), password: form.get('password') }) });
    localStorage.setItem('token', result.access_token); localStorage.setItem('role', result.role);
    setToken(result.access_token); notify('Signed in successfully.');
  });
  const signup = (event) => run('signup', async () => {
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget));
    await request('/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    setMode('login'); notify(data.role === 'govt' ? 'Request submitted for admin approval.' : 'Account created. Please sign in.');
  });
  const savePolicy = (form) => run('policy', async () => {
    await authenticatedRequest('/posts/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setRepostSource(null); notify(repostSource ? 'Updated policy reposted as a new policy.' : 'Policy published.'); reloadPolicies();
  });
  const addComment = (id, event) => run(`comment-${id}`, async () => {
    event.preventDefault(); const form = event.currentTarget;
    await authenticatedRequest(`/posts/${id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: new FormData(form).get('content') }) });
    form.reset(); notify('Reply added.'); reloadPolicies();
  });
  const deletePolicy = (policy) => {
    if (!window.confirm(`Delete “${policy.title}”?`)) return;
    run(`delete-${policy._id}`, async () => { await authenticatedRequest(`/posts/${policy._id}`, { method: 'DELETE' }); notify('Policy deleted.'); reloadPolicies(); });
  };
  const loadAccounts = () => run('accounts', async () => {
    const [pending, managed] = await Promise.all([authenticatedRequest('/auth/government-requests'), authenticatedRequest('/auth/users')]);
    setRequests(pending); setUsers(managed);
  });
  const approve = (id) => run(`approve-${id}`, async () => { await authenticatedRequest(`/auth/government-requests/${id}/approve`, { method: 'POST' }); notify('Government account approved.'); loadAccounts(); });
  const deleteUser = (user) => {
    if (!window.confirm(`Delete ${user.full_name}'s account?`)) return;
    run(`user-${user.id}`, async () => { await authenticatedRequest(`/auth/users/${user.id}`, { method: 'DELETE' }); notify('Account deleted.'); loadAccounts(); });
  };
  const getOverallAnalysis = () => run('overall-analysis', async () => setOverallAnalysis(await authenticatedRequest('/posts/analytics/overall-sentiment')));
  const getPolicyAnalysis = (id) => run(`analysis-${id}`, async () => {
    const analysis = await authenticatedRequest(`/posts/${id}/sentiment`);
    setPolicyAnalysis((items) => ({ ...items, [id]: analysis }));
  });

  if (authLoading) return <main className="status-screen">Restoring your session…</main>;
  if (!token || !currentUser) return <main className="auth-shell"><section className="brand"><span>PUBLIC VOICE</span><h1>Smart Government Feedback</h1><p>Policies made clearer through public participation.</p></section><section className="auth-card"><h2>{mode === 'login' ? 'Welcome back' : 'Create an account'}</h2>{message && <p className={`notice ${message.type}`}>{message.text}</p>}{mode === 'login' ? <form onSubmit={login}><label>Email<input required name="email" type="email" autoComplete="email" /></label><label>Password<input required name="password" type="password" autoComplete="current-password" /></label><button disabled={busy.login}>{busy.login ? 'Signing in…' : 'Sign in'}</button><button className="link" type="button" onClick={() => setMode('signup')}>New here? Register</button></form> : <form onSubmit={signup}><label>Full name<input required name="full_name" minLength="2" /></label><label>Email<input required name="email" type="email" autoComplete="email" /></label><label>Password<input required name="password" type="password" minLength="8" autoComplete="new-password" /></label><label>Aadhaar number<input required name="aadhaar_number" pattern="[0-9]{12}" title="12 digits" /></label><label>Contact number<input required name="contact_number" pattern="\+?[1-9][0-9]{7,14}" /></label><label>Account type<select name="role"><option value="public">Public</option><option value="govt">Government (requires approval)</option></select></label><button disabled={busy.signup}>{busy.signup ? 'Creating…' : 'Create account'}</button><button className="link" type="button" onClick={() => setMode('login')}>Back to sign in</button></form>}</section></main>;

  const isGovernment = currentUser.role === 'govt';
  const isAdmin = currentUser.role === 'admin';
  const pendingIds = new Set(requests.map((user) => user.id));
  return <main><header><div><span className="eyebrow">PUBLIC VOICE</span><h1>Policy Forum</h1></div><div className="user">Signed in as <b>{currentUser.full_name}</b><span className="role">{currentUser.role}</span><button className="outline" onClick={() => logout()}>Sign out</button></div></header><div className="content">{message && <p className={`notice ${message.type}`}>{message.text}</p>}
    {isGovernment && <section className="panel"><div className="row"><h2>{repostSource ? 'Repost policy with updates' : 'Publish a policy'}</h2><button className="outline" onClick={getOverallAnalysis} disabled={busy['overall-analysis']}>{busy['overall-analysis'] ? 'Loading…' : 'Overall feedback analysis'}</button></div>{repostSource && <p className="analysis">This creates a new policy; the original policy remains unchanged.</p>}{overallAnalysis && <p className="analysis">Policies: {overallAnalysis.policy_count} · Replies: {overallAnalysis.comment_count} · Sentiment: {overallAnalysis.analysis_status}</p>}<PolicyForm initialPolicy={repostSource} onSave={savePolicy} saving={busy.policy} onCancel={repostSource ? () => setRepostSource(null) : null} /></section>}
    {isAdmin && <section className="panel"><div className="row"><h2>Account management</h2><button className="outline" onClick={loadAccounts} disabled={busy.accounts}>{busy.accounts ? 'Loading…' : 'Load accounts'}</button></div>{requests.map((user) => <div className="request" key={user.id}><span><b>{user.full_name}</b> · {user.email} · pending government request</span><button disabled={busy[`approve-${user.id}`]} onClick={() => approve(user.id)}>{busy[`approve-${user.id}`] ? 'Approving…' : 'Approve'}</button></div>)}{users.filter((user) => !pendingIds.has(user.id)).map((user) => <div className="request" key={user.id}><span><b>{user.full_name}</b> · {user.email} · {user.role}</span><button className="danger" disabled={busy[`user-${user.id}`]} onClick={() => deleteUser(user)}>{busy[`user-${user.id}`] ? 'Deleting…' : 'Delete'}</button></div>)}</section>}
    <section className="filters"><input placeholder="Search policies" value={filters.keyword} onChange={(event) => setFilters({ ...filters, keyword: event.target.value })} /><label>From<input type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} /></label><label>To<input type="date" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} /></label><label className="checkbox"><input type="checkbox" checked={filters.recent} onChange={(event) => setFilters({ ...filters, recent: event.target.checked })} /> Last 7 days</label><select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="most_replied">Most replied</option></select></section>
    <section className="feed" aria-busy={policiesLoading}>{policiesLoading ? <p>Loading policies…</p> : policies.map((policy) => { const ownsPolicy = isGovernment && policy.author_email === currentUser.email; const canDelete = isAdmin || ownsPolicy; return <article className="policy" key={policy._id}><div className="policy-top"><div><span className="tag">{policy.category}</span><h2>{policy.title}</h2><p className="muted">{policy.location} · {new Date(policy.created_at).toLocaleDateString()}</p></div>{canDelete && <div className="card-actions">{ownsPolicy && <button className="outline" onClick={() => setRepostSource(policy)}>Repost with updates</button>}<button className="danger" disabled={busy[`delete-${policy._id}`]} onClick={() => deletePolicy(policy)}>{busy[`delete-${policy._id}`] ? 'Deleting…' : 'Delete'}</button></div>}</div><p>{policy.description}</p><h3>Public replies ({policy.comments?.length || 0})</h3>{policy.comments?.map((comment, index) => <div className="comment" key={`${comment.author_email}-${comment.created_at}-${index}`}><b>{comment.author_email}</b><p>{comment.content}</p></div>)}{ownsPolicy && <div className="analysis-row"><button className="outline" disabled={busy[`analysis-${policy._id}`]} onClick={() => getPolicyAnalysis(policy._id)}>{busy[`analysis-${policy._id}`] ? 'Loading…' : 'View policy analysis'}</button>{policyAnalysis[policy._id] && <span>{policyAnalysis[policy._id].comment_count} replies · {policyAnalysis[policy._id].analysis_status}</span>}</div>}{currentUser.role === 'public' && <form className="comment-form" onSubmit={(event) => addComment(policy._id, event)}><input name="content" required minLength="1" maxLength="2000" placeholder="Share your feedback" /><button disabled={busy[`comment-${policy._id}`]}>{busy[`comment-${policy._id}`] ? 'Posting…' : 'Reply'}</button></form>}</article>; })}{!policiesLoading && policies.length === 0 && <p>No policies match these filters.</p>}</section>
  </div></main>;
}

export default App;
