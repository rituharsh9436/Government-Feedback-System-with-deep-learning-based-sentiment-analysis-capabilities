import { useEffect, useState } from 'react';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

async function api(path, options = {}, token = '') {
  const response = await fetch(`${API}${path}`, { ...options, headers: { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'Something went wrong');
  return data;
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [role, setRole] = useState(localStorage.getItem('role') || '');
  const [mode, setMode] = useState('login');
  const [message, setMessage] = useState('');
  const [policies, setPolicies] = useState([]);
  const [filters, setFilters] = useState({ keyword: '', recent: false, sort: 'newest' });
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [post, setPost] = useState({ title: '', description: '', category: '', location: '' });

  const loadPolicies = async () => {
    const p = new URLSearchParams();
    if (filters.keyword) p.set('keyword', filters.keyword);
    if (filters.recent) p.set('recent', 'true');
    p.set('sort', filters.sort);
    try { setPolicies(await api(`/posts/?${p}`)); } catch (e) { setMessage(e.message); }
  };
  // loadPolicies deliberately runs only when a filter changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadPolicies(); }, [filters.keyword, filters.recent, filters.sort]);

  const login = async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try {
      const result = await api('/auth/login', { method: 'POST', body: new URLSearchParams({ username: form.get('email'), password: form.get('password') }) });
      localStorage.setItem('token', result.access_token); localStorage.setItem('role', result.role);
      setToken(result.access_token); setRole(result.role); setMessage('Signed in successfully.');
    } catch (e) { setMessage(e.message); }
  };
  const signup = async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try {
      const data = Object.fromEntries(form); await api('/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      setMessage(data.role === 'govt' ? 'Request submitted. An admin must approve it before login.' : 'Account created. Please sign in.'); setMode('login');
    } catch (e) { setMessage(e.message); }
  };
  const logout = () => { localStorage.clear(); setToken(''); setRole(''); setMessage('Signed out.'); };
  const addComment = async (id, event) => {
    event.preventDefault(); const content = new FormData(event.currentTarget).get('content');
    try { await api(`/posts/${id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) }, token); event.currentTarget.reset(); setMessage('Reply added.'); loadPolicies(); } catch (e) { setMessage(e.message); }
  };
  const createPolicy = async (event) => {
    event.preventDefault();
    try { await api('/posts/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(post) }, token); setPost({ title: '', description: '', category: '', location: '' }); setMessage('Policy published.'); loadPolicies(); } catch (e) { setMessage(e.message); }
  };
  const deletePolicy = async (id) => {
    if (!window.confirm('Delete this policy?')) return;
    try { await api(`/posts/${id}`, { method: 'DELETE' }, token); setMessage('Policy deleted.'); loadPolicies(); } catch (e) { setMessage(e.message); }
  };
  const loadRequests = async () => { try { setRequests(await api('/auth/government-requests', {}, token)); } catch (e) { setMessage(e.message); } };
  const approve = async (id) => { try { await api(`/auth/government-requests/${id}/approve`, { method: 'POST' }, token); setMessage('Government account approved.'); loadRequests(); } catch (e) { setMessage(e.message); } };
  const loadUsers = async () => { try { setUsers(await api('/auth/users', {}, token)); } catch (e) { setMessage(e.message); } };
  const deleteUser = async (id) => { if (!window.confirm('Delete this account?')) return; try { await api(`/auth/users/${id}`, { method: 'DELETE' }, token); setMessage('Account deleted.'); loadUsers(); } catch (e) { setMessage(e.message); } };

  if (!token) return <main className="auth-shell"><section className="brand"><span>PUBLIC VOICE</span><h1>Smart Government Feedback</h1><p>Policies made clearer through public participation.</p></section><section className="auth-card"><h2>{mode === 'login' ? 'Welcome back' : 'Create an account'}</h2>{message && <p className="notice">{message}</p>}{mode === 'login' ? <form onSubmit={login}><label>Email<input required name="email" type="email" /></label><label>Password<input required name="password" type="password" /></label><button>Sign in</button><button className="link" type="button" onClick={() => setMode('signup')}>New here? Register</button></form> : <form onSubmit={signup}><label>Full name<input required name="full_name" minLength="2" /></label><label>Email<input required name="email" type="email" /></label><label>Password<input required name="password" type="password" minLength="8" /></label><label>Aadhaar number<input required name="aadhaar_number" pattern="[0-9]{12}" title="12 digits" /></label><label>Contact number<input required name="contact_number" pattern="\+?[1-9][0-9]{7,14}" /></label><label>Account type<select name="role"><option value="public">Public</option><option value="govt">Government (requires approval)</option></select></label><button>Create account</button><button className="link" type="button" onClick={() => setMode('login')}>Back to sign in</button></form>}</section></main>;

  return <main><header><div><span className="eyebrow">PUBLIC VOICE</span><h1>Policy Forum</h1></div><div className="user">Signed in as <b>{role}</b><button className="outline" onClick={logout}>Sign out</button></div></header><div className="content">{message && <p className="notice">{message}</p>}{role === 'govt' && <section className="panel"><h2>Publish a policy</h2><form className="policy-form" onSubmit={createPolicy}>{['title', 'category', 'location'].map(k => <label key={k}>{k}<input required value={post[k]} onChange={e => setPost({ ...post, [k]: e.target.value })} /></label>)}<label className="wide">Description<textarea required minLength="10" value={post.description} onChange={e => setPost({ ...post, description: e.target.value })} /></label><button>Publish policy</button></form></section>}{role === 'admin' && <section className="panel"><div className="row"><h2>Account management</h2><button className="outline" onClick={() => { loadRequests(); loadUsers(); }}>Load accounts</button></div>{requests.map(r => <div className="request" key={r.id}><span><b>{r.full_name}</b> · {r.email} · pending government request</span><button onClick={() => approve(r.id)}>Approve</button></div>)}{users.map(u => <div className="request" key={u.id}><span><b>{u.full_name}</b> · {u.email} · {u.role}</span><button className="danger" onClick={() => deleteUser(u.id)}>Delete</button></div>)}</section>}<section className="filters"><input placeholder="Search policies" value={filters.keyword} onChange={e => setFilters({ ...filters, keyword: e.target.value })} /><label><input type="checkbox" checked={filters.recent} onChange={e => setFilters({ ...filters, recent: e.target.checked })} /> Last 7 days</label><select value={filters.sort} onChange={e => setFilters({ ...filters, sort: e.target.value })}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="most_replied">Most replied</option></select></section><section className="feed">{policies.map(p => <article className="policy" key={p._id}><div className="policy-top"><div><span className="tag">{p.category}</span><h2>{p.title}</h2><p className="muted">{p.location} · {new Date(p.created_at).toLocaleDateString()}</p></div>{(role === 'admin' || (role === 'govt' && p.author_email)) && <button className="danger" onClick={() => deletePolicy(p._id)}>Delete</button>}</div><p>{p.description}</p><h3>Public replies ({p.comments?.length || 0})</h3>{p.comments?.map((c, i) => <div className="comment" key={i}><b>{c.author_email}</b><p>{c.content}</p></div>)}{role === 'public' && <form className="comment-form" onSubmit={e => addComment(p._id, e)}><input name="content" required minLength="1" maxLength="2000" placeholder="Share your feedback" /><button>Reply</button></form>}</article>)}{policies.length === 0 && <p>No policies match these filters.</p>}</section></div></main>;
}

export default App;
