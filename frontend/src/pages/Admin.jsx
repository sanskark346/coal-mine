import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Badge, Card, Msg, Spinner, fmt } from '../components/ui';

export default function Admin() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null), [mines, setMines] = useState([]), [log, setLog] = useState([]), [m, setM] = useState(null);
  const load = useCallback(async () => { try { const [u, mi, l] = await Promise.all([api('/users'), api('/mines'), api('/activity')]); setUsers(u); setMines(mi); setLog(l); } catch (e) { setM({ type: 'err', text: e.message }); } }, []);
  useEffect(() => { load(); }, [load]);
  async function run(fn, ok) { try { await fn(); setM({ type: 'ok', text: ok }); load(); } catch (e) { setM({ type: 'err', text: e.message }); } }
  if (!users) return m ? <Msg m={m} /> : <Spinner />;
  const pending = mines.filter(x => x.approval === 'Pending');
  return (
    <>
      <div className="page-h"><h1>Admin Panel</h1></div>
      <Msg m={m} />
      <Card className="mb" title={`Pending mine approvals (${pending.length})`}>
        {pending.length ? pending.map(x => <div className="item" key={x.id}><b>{x.name}</b> ({x.code}, {x.subsidiary}, {x.state}) · operator {x.operatorName}<br />
          <button className="sm" onClick={() => run(() => api(`/mines/${x.id}/approval`, { method: 'PATCH', body: { decision: 'Approved' } }), 'Mine approved.')}>Approve</button> <button className="sm red" onClick={() => run(() => api(`/mines/${x.id}/approval`, { method: 'PATCH', body: { decision: 'Rejected' } }), 'Mine rejected.')}>Reject</button></div>) : <p className="muted">Nothing is waiting for approval.</p>}
      </Card>
      <Card className="mb" title={`User management (${users.length})`}><div className="tw"><table><thead><tr><th>Name</th><th>Email</th><th>Organisation</th><th>Role</th><th>Status</th><th /></tr></thead><tbody>
        {users.map(u => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.organisation}</td>
          <td><select disabled={u.id === me.id} value={u.role} onChange={e => run(() => api('/users/' + u.id, { method: 'PATCH', body: { role: e.target.value } }), 'Role updated.')}><option value="admin">admin</option><option value="operator">operator</option><option value="inspector">inspector</option></select></td>
          <td><Badge v={u.active === false ? 'Rejected' : 'Active'} /></td>
          <td style={{ whiteSpace: 'nowrap' }}>{u.id !== me.id && <><button className="sm dark" onClick={() => run(() => api('/users/' + u.id, { method: 'PATCH', body: { active: u.active === false } }), 'User status updated.')}>{u.active === false ? 'Enable' : 'Disable'}</button> <button className="sm red" onClick={() => window.confirm('Delete ' + u.email + '?') && run(() => api('/users/' + u.id, { method: 'DELETE' }), 'User deleted.')}>Delete</button></>}</td></tr>)}</tbody></table></div></Card>
      <Card title="Audit log (latest activity)">{log.map(a => <div className="item" key={a.id}>{a.action}<br /><small>{a.user} ({a.role}) · {fmt(a.createdAt)}</small></div>)}</Card>
    </>
  );
}
