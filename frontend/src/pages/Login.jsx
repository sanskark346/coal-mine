import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, homeFor } from '../auth';
import { Msg } from '../components/ui';

const DEMO = [['Admin', 'admin@coal.gov', 'Admin@123'], ['Mine Operator', 'operator@coal.gov', 'Operator@123'], ['Inspector', 'inspector@coal.gov', 'Inspector@123']];
export default function Login() {
  const { login, register } = useAuth(), nav = useNavigate();
  const [tab, setTab] = useState('login'), [show, setShow] = useState(false), [busy, setBusy] = useState(false), [m, setM] = useState(null);
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'operator', organisation: '' });
  const set = k => e => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setM(null);
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setM({ type: 'err', text: 'Enter a valid email address.' });
    if (f.password.length < 6) return setM({ type: 'err', text: 'Password must be at least 6 characters.' });
    if (tab === 'register' && f.name.trim().length < 2) return setM({ type: 'err', text: 'Enter your full name.' });
    setBusy(true);
    try { const u = tab === 'login' ? await login(f.email, f.password) : await register(f); nav(homeFor(u.role)); }
    catch (err) { setM({ type: 'err', text: err.message }); } finally { setBusy(false); }
  }
  return (
    <div className="pub loginwrap"><div className="loginbox">
      <Link to="/" className="brand" style={{ padding: 0 }}>⛏ CoalGuard</Link>
      <div className="tabs" style={{ marginTop: 12 }}><button className={tab === 'login' ? 'on' : ''} onClick={() => { setTab('login'); setM(null); }}>Login</button><button className={tab === 'register' ? 'on' : ''} onClick={() => { setTab('register'); setM(null); }}>Register</button></div>
      <Msg m={m} />
      <form onSubmit={submit} className="form" style={{ gridTemplateColumns: '1fr' }}>
        {tab === 'register' && <><div><label>Full name</label><input value={f.name} onChange={set('name')} /></div>
          <div><label>Role</label><select value={f.role} onChange={set('role')}><option value="operator">Mine Operator</option><option value="inspector">Inspector</option></select></div>
          <div><label>Organisation</label><input value={f.organisation} onChange={set('organisation')} placeholder="e.g. BCCL" /></div></>}
        <div><label>Email</label><input type="email" value={f.email} onChange={set('email')} autoComplete="username" /></div>
        <div><label>Password</label><div className="pw"><input type={show ? 'text' : 'password'} value={f.password} onChange={set('password')} autoComplete="current-password" /><button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></div></div>
        <button disabled={busy}>{busy ? 'Please wait…' : tab === 'login' ? 'Login' : 'Create account'}</button>
      </form>
      <div className="demo"><b>Demo accounts (tap to fill)</b>{DEMO.map(d => <div key={d[1]} onClick={() => { setTab('login'); setF({ ...f, email: d[1], password: d[2] }); }}>{d[0]}: {d[1]} / {d[2]}</div>)}</div>
    </div></div>
  );
}
