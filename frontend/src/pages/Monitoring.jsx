import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { LineChart } from '../components/Charts';
import { Badge, Card, Msg, Spinner } from '../components/ui';

const blank = { name: '', code: '', subsidiary: '', state: '', lat: '', lon: '', production: '', workers: '', ppeCompliance: '95', inspectionIntervalDays: '30', equipment: '' };
const blankR = { methane: '', pm10: '', temperature: '', humidity: '', ph: '' };

export default function Monitoring() {
  const { user } = useAuth(), admin = user.role === 'admin';
  const [mines, setMines] = useState(null), [sel, setSel] = useState(null), [reads, setReads] = useState([]), [m, setM] = useState(null);
  const [q, setQ] = useState(''), [st, setSt] = useState(''), [auto, setAuto] = useState(false);
  const [form, setForm] = useState(null), [edit, setEdit] = useState(null), [rf, setRf] = useState(blankR);
  const flash = (type, text) => setM({ type, text });
  const loadMines = useCallback(async () => { try { const x = await api('/mines'); setMines(x); setSel(s => (s && x.some(y => y.id === s) ? s : x[0]?.id || null)); } catch (e) { flash('err', e.message); } }, []);
  const loadReads = useCallback(async () => { if (sel) try { setReads(await api('/sensors?mineId=' + sel)); } catch (e) { flash('err', e.message); } else setReads([]); }, [sel]);
  useEffect(() => { loadMines(); }, [loadMines]);
  useEffect(() => { loadReads(); }, [loadReads]);
  const simulate = useCallback(async quiet => { try { const r = await api('/sensors/simulate', { method: 'POST' }); if (!quiet || r.newAlerts) flash('ok', `Simulated ${r.readings} readings. ${r.newAlerts} new alert(s).`); await loadMines(); await loadReads(); } catch (e) { flash('err', e.message); setAuto(false); } }, [loadMines, loadReads]);
  useEffect(() => { if (!auto) return; const t = setInterval(() => simulate(true), 6000); return () => clearInterval(t); }, [auto, simulate]);
  if (!mines) return m ? <Msg m={m} /> : <Spinner />;

  const mine = mines.find(x => x.id === sel), last = reads[reads.length - 1];
  const list = mines.filter(x => (!st || x.status === st) && (x.name + x.code + x.subsidiary + x.state).toLowerCase().includes(q.toLowerCase()));
  const level = (k, v) => ({ methane: v >= 1.25 ? 'Critical' : v >= 0.75 ? 'Warning' : '', pm10: v >= 250 ? 'Critical' : v >= 100 ? 'Warning' : '', temperature: v >= 37 ? 'Warning' : '', ph: v < 6.5 || v > 8.5 ? 'Warning' : '' }[k] || '');
  const body = f => ({ ...f, equipment: f.equipment ? String(f.equipment).split(',').map(n => ({ name: n.trim(), status: 'Operational' })) : [] });

  async function saveMine(e) {
    e.preventDefault(); setM(null);
    try {
      if (edit) { const { equipment, ...rest } = form; await api('/mines/' + edit, { method: 'PUT', body: rest }); flash('ok', 'Mine updated.'); }
      else { const r = await api('/mines', { method: 'POST', body: body(form) }); flash('ok', r.approval === 'Pending' ? 'Mine registered. It is waiting for admin approval.' : 'Mine registered.'); }
      setForm(null); setEdit(null); await loadMines();
    } catch (err) { flash('err', err.message); }
  }
  async function del(x) { if (!window.confirm(`Delete ${x.name} with all its readings and alerts?`)) return; try { await api('/mines/' + x.id, { method: 'DELETE' }); flash('ok', 'Mine deleted.'); await loadMines(); } catch (e) { flash('err', e.message); } }
  async function post(path, b, ok) { try { await api(path, { method: path.includes('approval') ? 'PATCH' : 'POST', body: b }); flash('ok', ok); await loadMines(); await loadReads(); } catch (e) { flash('err', e.message); } }
  async function submitReading(e) {
    e.preventDefault();
    try { const r = await api('/sensors', { method: 'POST', body: { mineId: sel, ...rf } }); flash('ok', `Reading saved. ${r.alerts.length} new alert(s).`); setRf(blankR); await loadMines(); await loadReads(); } catch (err) { flash('err', err.message); }
  }
  const F = (k, label, type = 'text') => <div key={k}><label>{label}</label><input type={type} value={form[k] ?? ''} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>;

  return (
    <>
      <div className="page-h"><h1>Mine Monitoring System</h1><span className="grow" />
        {user.role !== 'inspector' && <button onClick={() => { setForm(blank); setEdit(null); }}>+ Register mine</button>}
        <button className="dark" onClick={() => simulate(false)}>Simulate readings</button>
        <button className={auto ? 'red' : 'ghost'} onClick={() => setAuto(!auto)}>{auto ? 'Stop live simulation' : 'Start live simulation'}</button></div>
      <Msg m={m} />
      {form && <Card className="mb" title={edit ? 'Edit mine' : 'Register a new mine'}><form onSubmit={saveMine}><div className="form">
        {F('name', 'Mine name')}{F('code', 'Mine code (unique)')}{F('subsidiary', 'Subsidiary')}{F('state', 'State')}{F('lat', 'Latitude', 'number')}{F('lon', 'Longitude', 'number')}
        {F('production', 'Production (t/day)', 'number')}{F('workers', 'Workers', 'number')}{F('ppeCompliance', 'PPE compliance %', 'number')}{F('inspectionIntervalDays', 'Inspection every (days)', 'number')}
        {!edit && <div className="wide"><label>Equipment (comma separated)</label><input value={form.equipment} onChange={e => setForm({ ...form, equipment: e.target.value })} placeholder="Dragline, Shovel, Dumper" /></div>}
      </div><p style={{ marginBottom: 0 }}><button>{edit ? 'Save changes' : 'Register'}</button> <button type="button" className="ghost" onClick={() => { setForm(null); setEdit(null); }}>Cancel</button></p></form></Card>}

      <Card title={`Registered mines (${list.length})`} className="mb">
        <div className="filters"><input placeholder="Search name, code, subsidiary or state" value={q} onChange={e => setQ(e.target.value)} /><select value={st} onChange={e => setSt(e.target.value)}><option value="">All statuses</option><option>Active</option><option>Warning</option><option>Critical</option></select></div>
        <div className="tw"><table><thead><tr><th>Mine</th><th>Subsidiary</th><th>Location</th><th>Operator</th><th>Status</th><th>Approval</th><th /></tr></thead><tbody>
          {list.map(x => <tr key={x.id} className={x.id === sel ? 'sel' : ''}><td><b>{x.name}</b><br /><small className="muted">{x.code}</small></td><td>{x.subsidiary}</td><td>{x.state}<br /><small className="muted">{x.lat}, {x.lon}</small></td><td>{x.operatorName}</td><td><Badge v={x.status} />{x.underInspection && <><br /><small>Under inspection</small></>}</td><td><Badge v={x.approval} /></td>
            <td style={{ whiteSpace: 'nowrap' }}><button className="sm dark" onClick={() => setSel(x.id)}>View</button>
              {admin && <> <button className="sm ghost" onClick={() => { setEdit(x.id); setForm({ name: x.name, code: x.code, subsidiary: x.subsidiary, state: x.state, lat: x.lat, lon: x.lon, production: x.production, workers: x.workers, ppeCompliance: x.ppeCompliance, inspectionIntervalDays: x.inspectionIntervalDays }); window.scrollTo(0, 0); }}>Edit</button> <button className="sm red" onClick={() => del(x)}>Delete</button></>}</td></tr>)}
          {!list.length && <tr><td colSpan="7" className="muted">No mines found.</td></tr>}</tbody></table></div>
      </Card>

      {mine && <div className="grid">
        <Card title={mine.name + ' – details'} right={<Badge v={mine.status} />}>
          <div className="item">Production: <b>{mine.production} t/day</b> · Workers: <b>{mine.workers}</b></div>
          <div className="item">PPE compliance: <b>{mine.ppeCompliance}%</b> · Compliance score: <b>{mine.complianceScore ?? 100}%</b></div>
          <div className="item">Last inspection: <b>{mine.lastInspection}</b> (every {mine.inspectionIntervalDays} days)</div>
          <div className="item">Equipment:{mine.equipment?.length ? mine.equipment.map(e => <span key={e.name}> {e.name} <Badge v={e.status} /></span>) : ' none recorded'}</div>
          <p style={{ marginBottom: 0 }}>
            {user.role !== 'operator' && (mine.underInspection ? <button onClick={() => post(`/mines/${mine.id}/inspect`, { action: 'complete' }, 'Inspection completed and dates updated.')}>Complete inspection</button> : <button className="dark" onClick={() => post(`/mines/${mine.id}/inspect`, { action: 'start' }, 'Inspection started.')}>Start inspection</button>)}
            {admin && mine.approval === 'Pending' && <> <button onClick={() => post(`/mines/${mine.id}/approval`, { decision: 'Approved' }, 'Mine approved.')}>Approve</button> <button className="red" onClick={() => post(`/mines/${mine.id}/approval`, { decision: 'Rejected' }, 'Mine rejected.')}>Reject</button></>}</p>
        </Card>
        <Card title="Latest sensor readings" right={<span className="sim-tag">simulated / demo</span>}>
          {last ? <><div className="gauges">{[['methane', 'Methane', '%'], ['pm10', 'Air PM10', ' µg/m³'], ['temperature', 'Temperature', '°C'], ['humidity', 'Humidity', '%'], ['ph', 'Water pH', '']].map(g => <div key={g[0]} className={'gauge ' + level(g[0], last[g[0]])}><small>{g[1]}</small><b>{last[g[0]]}</b><small>{g[2]}</small></div>)}</div><small className="muted">Recorded {last.createdAt.slice(0, 16).replace('T', ' ')} · source: {last.source}</small></> : <p className="muted">No readings yet. Submit one or use the simulation.</p>}
        </Card>
        <Card title="Methane trend (last readings)"><LineChart values={reads.map(r => r.methane)} labels={reads.map(r => r.createdAt.slice(11, 16))} limit={1.25} unit="%" /></Card>
        <Card title="PM10 air quality trend"><LineChart color="#12304f" values={reads.map(r => r.pm10)} labels={reads.map(r => r.createdAt.slice(11, 16))} limit={100} /></Card>
        <Card title="Submit a sensor reading">
          <form onSubmit={submitReading}><div className="form">{[['methane', 'Methane %'], ['pm10', 'PM10 µg/m³'], ['temperature', 'Temperature °C'], ['humidity', 'Humidity %'], ['ph', 'Water pH']].map(f => <div key={f[0]}><label>{f[1]}</label><input type="number" step="any" value={rf[f[0]]} onChange={e => setRf({ ...rf, [f[0]]: e.target.value })} /></div>)}</div><p style={{ marginBottom: 0 }}><button>Save reading</button></p></form>
        </Card>
      </div>}
    </>
  );
}
