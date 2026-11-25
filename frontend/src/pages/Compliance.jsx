import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Badge, Card, Msg, Spinner } from '../components/ui';

export default function Compliance() {
  const { user } = useAuth(), staff = user.role !== 'operator';
  const [sum, setSum] = useState(null), [alerts, setAlerts] = useState([]), [m, setM] = useState(null), [busy, setBusy] = useState(false);
  const [q, setQ] = useState(''), [sev, setSev] = useState(''), [stat, setStat] = useState(''), [cat, setCat] = useState('');
  const load = useCallback(async () => { try { const [s, a] = await Promise.all([api('/compliance/summary'), api('/alerts')]); setSum(s); setAlerts(a); } catch (e) { setM({ type: 'err', text: e.message }); } }, []);
  useEffect(() => { load(); }, [load]);
  async function run() {
    setBusy(true); setM(null);
    try { const r = await api('/compliance/check', { method: 'POST' }); setM({ type: 'ok', text: `Checked ${r.checked} mines. ${r.newAlerts} new alert(s) created.` }); await load(); }
    catch (e) { setM({ type: 'err', text: e.message }); } finally { setBusy(false); }
  }
  async function act(fn, ok) { try { await fn(); setM({ type: 'ok', text: ok }); await load(); } catch (e) { setM({ type: 'err', text: e.message }); } }
  if (!sum) return m ? <Msg m={m} /> : <Spinner />;
  const rows = alerts.filter(a => (!sev || a.severity === sev) && (!stat || a.status === stat) && (!cat || a.category === cat) && (a.mineName + a.reason + a.action).toLowerCase().includes(q.toLowerCase()));
  const col = s => (s >= 85 ? 'var(--ok)' : s >= 65 ? 'var(--warn)' : 'var(--cr)');
  const t = sum.thresholds;
  return (
    <>
      <div className="page-h"><h1>AI-Based Compliance Monitoring</h1><span className="grow" />{staff && <button disabled={busy} onClick={run}>{busy ? 'Checking…' : 'Run compliance check'}</button>}</div>
      <Msg m={m} />
      <Card className="mb" title="How this works"><p style={{ margin: 0 }}>{sum.method}. Methane warning at {t.methaneWarn}%, critical at {t.methaneCrit}%. PM10 warning at {t.pm10Warn}, critical at {t.pm10Crit} µg/m³. Temperature warning at {t.tempWarn}°C. Water pH must stay within {t.phMin}–{t.phMax}. PPE compliance must be at least {t.ppeMin}%. An inspection is a violation when it is overdue. Limits are set in <code>backend/.env</code>.</p></Card>
      <div className="grid mb">{sum.mines.map(x => <Card key={x.mineId} title={x.name} right={<Badge v={x.risk} />}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Compliance score</span><b>{x.score}%</b></div><div className="bar"><i style={{ width: x.score + '%', background: col(x.score) }} /></div>
        <p style={{ margin: '10px 0 4px' }}>{x.analysis}</p>
        {x.recommendations.length > 0 && <><small className="muted">Recommendations</small><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{x.recommendations.map(r => <li key={r}>{r}</li>)}</ul></>}
        <small className="muted">{x.violationsTotal} violations on record</small>
      </Card>)}</div>
      <Card title={`Alerts and violation history (${rows.length})`}>
        <div className="filters">
          <input placeholder="Search mine, reason or action" value={q} onChange={e => setQ(e.target.value)} />
          <select value={sev} onChange={e => setSev(e.target.value)}><option value="">All severities</option><option>Critical</option><option>High</option><option>Warning</option></select>
          <select value={cat} onChange={e => setCat(e.target.value)}><option value="">All categories</option><option>Safety</option><option>Environmental</option><option>Compliance</option></select>
          <select value={stat} onChange={e => setStat(e.target.value)}><option value="">Open and resolved</option><option>Open</option><option>Resolved</option></select>
        </div>
        <div className="tw"><table><thead><tr><th>Date</th><th>Mine</th><th>Severity</th><th>Category</th><th>Reason</th><th>Recommended action</th><th>Status</th>{staff && <th />}</tr></thead>
          <tbody>{rows.map(a => <tr key={a.id}><td>{a.date}</td><td>{a.mineName}</td><td><Badge v={a.severity} /></td><td>{a.category}{a.isViolation ? ' · violation' : ''}</td><td>{a.reason}</td><td>{a.action}</td><td><Badge v={a.status} /></td>
            {staff && <td style={{ whiteSpace: 'nowrap' }}><button className="sm dark" onClick={() => act(() => api('/alerts/' + a.id, { method: 'PATCH', body: { status: a.status === 'Open' ? 'Resolved' : 'Open' } }), 'Alert updated.')}>{a.status === 'Open' ? 'Resolve' : 'Reopen'}</button>{user.role === 'admin' && <> <button className="sm red" onClick={() => window.confirm('Delete this alert?') && act(() => api('/alerts/' + a.id, { method: 'DELETE' }), 'Alert deleted.')}>Delete</button></>}</td>}</tr>)}
            {!rows.length && <tr><td colSpan="8" className="muted">No alerts match your filters.</td></tr>}</tbody></table></div>
      </Card>
    </>
  );
}
