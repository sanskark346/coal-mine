import React, { useCallback, useEffect, useState } from 'react';
import { api, download } from '../api';
import { useAuth } from '../auth';
import { Badge, Card, Msg, Spinner, fmt } from '../components/ui';

const TYPES = [['daily', 'Daily monitoring'], ['weekly', 'Weekly compliance'], ['monthly', 'Monthly compliance'], ['mine-performance', 'Mine-wise performance'], ['environmental', 'Environmental'], ['safety', 'Safety'], ['violations', 'Violations']];
const CATS = ['Safety', 'Worker welfare', 'Environment', 'Wages and labour', 'Equipment', 'Other'];

export default function Reports() {
  const { user } = useAuth(), admin = user.role === 'admin';
  const [type, setType] = useState('weekly'), [rep, setRep] = useState(null), [q, setQ] = useState(''), [m, setM] = useState(null), [busy, setBusy] = useState(false);
  const [gs, setGs] = useState([]), [mines, setMines] = useState([]), [g, setG] = useState({ subject: '', category: 'Safety', mineId: '', description: '' }), [resp, setResp] = useState({});
  const loadRep = useCallback(() => { setRep(null); api('/reports/' + type).then(setRep).catch(e => setM({ type: 'err', text: e.message })); }, [type]);
  const loadG = useCallback(() => api('/grievances').then(setGs).catch(e => setM({ type: 'err', text: e.message })), []);
  useEffect(() => { loadRep(); }, [loadRep]);
  useEffect(() => { loadG(); api('/mines').then(setMines).catch(() => {}); }, [loadG]);

  async function csv() { setBusy(true); try { await download(`/reports/${type}?format=csv`, `${type}-report.csv`); setM({ type: 'ok', text: 'CSV downloaded.' }); } catch (e) { setM({ type: 'err', text: e.message }); } finally { setBusy(false); } }
  async function submitG(e) {
    e.preventDefault(); setM(null);
    try { await api('/grievances', { method: 'POST', body: g }); setM({ type: 'ok', text: 'Grievance submitted.' }); setG({ subject: '', category: 'Safety', mineId: '', description: '' }); loadG(); } catch (err) { setM({ type: 'err', text: err.message }); }
  }
  async function respond(x) {
    const r = resp[x.id] || {};
    try { await api('/grievances/' + x.id, { method: 'PATCH', body: { status: r.status || x.status, response: r.response ?? x.response } }); setM({ type: 'ok', text: 'Grievance updated.' }); loadG(); } catch (e) { setM({ type: 'err', text: e.message }); }
  }
  const rows = rep ? rep.rows.filter(r => r.join(' ').toLowerCase().includes(q.toLowerCase())) : [];
  const mineName = id => mines.find(x => x.id === id)?.name || 'General';
  return (
    <>
      <div className="page-h"><h1>Reports, Analytics and Grievances</h1></div>
      <Msg m={m} />
      <Card title={rep ? rep.title : 'Report'} className="mb" right={<span className="noprint"><button className="sm" disabled={busy} onClick={csv}>Download CSV</button> <button className="sm dark" onClick={() => window.print()}>Download PDF</button></span>}>
        <div className="filters noprint"><select value={type} onChange={e => setType(e.target.value)}>{TYPES.map(t => <option key={t[0]} value={t[0]}>{t[1]}</option>)}</select><input placeholder="Search inside the report" value={q} onChange={e => setQ(e.target.value)} /></div>
        {!rep ? <Spinner /> : <div className="tw"><table><thead><tr>{rep.columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{['Critical', 'High', 'Warning', 'Open', 'Resolved', 'Active'].includes(c) ? <Badge v={c} /> : String(c)}</td>)}</tr>)}{!rows.length && <tr><td colSpan={rep.columns.length} className="muted">No data for this report.</td></tr>}</tbody></table></div>}
        <small className="muted noprint">PDF: choose “Save as PDF” as the printer in the print window. {rep && `Generated ${fmt(rep.generatedAt)}.`}</small>
      </Card>
      <div className="grid">
        <Card title="Submit a grievance"><form onSubmit={submitG}><div className="form">
          <div className="wide"><label>Subject</label><input value={g.subject} onChange={e => setG({ ...g, subject: e.target.value })} /></div>
          <div><label>Category</label><select value={g.category} onChange={e => setG({ ...g, category: e.target.value })}>{CATS.map(c => <option key={c}>{c}</option>)}</select></div>
          <div><label>Mine (optional)</label><select value={g.mineId} onChange={e => setG({ ...g, mineId: e.target.value })}><option value="">General</option>{mines.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="wide"><label>Description</label><textarea rows="4" value={g.description} onChange={e => setG({ ...g, description: e.target.value })} /></div></div><p style={{ marginBottom: 0 }}><button>Submit grievance</button></p></form></Card>
        <Card title={admin ? 'All grievances (admin response)' : 'My grievances'}>
          {gs.length ? gs.map(x => <div className="item" key={x.id}><b>{x.subject}</b> <Badge v={x.status} /><br /><small>{x.category} · {mineName(x.mineId)} · {x.userName} · {fmt(x.createdAt)}</small><br />{x.description}
            {x.response && <div className="muted">Admin response: {x.response}</div>}
            {admin && <div className="filters" style={{ marginTop: 6 }}><select defaultValue={x.status} onChange={e => setResp({ ...resp, [x.id]: { ...resp[x.id], status: e.target.value } })}>{['Submitted', 'Under Review', 'Resolved', 'Rejected'].map(s => <option key={s}>{s}</option>)}</select><input placeholder="Response" defaultValue={x.response} onChange={e => setResp({ ...resp, [x.id]: { ...resp[x.id], response: e.target.value } })} /><button className="sm" onClick={() => respond(x)}>Update</button></div>}</div>) : <p className="muted">No grievances yet.</p>}
        </Card>
      </div>
    </>
  );
}
