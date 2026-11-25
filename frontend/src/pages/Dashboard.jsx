import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { BarChart, Donut } from '../components/Charts';
import { Badge, Card, Msg, Spinner, Stat, fmt } from '../components/ui';

export default function Dashboard() {
  const [d, setD] = useState(null), [err, setErr] = useState(null), [at, setAt] = useState('');
  const load = useCallback(() => api('/dashboard/stats').then(x => { setD(x); setAt(new Date().toLocaleTimeString()); setErr(null); }).catch(e => setErr({ type: 'err', text: e.message })), []);
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);
  if (!d) return err ? <Msg m={err} /> : <Spinner />;
  const t = d.totals, short = s => s.split(' ')[0];
  const colour = s => (s >= 85 ? 'var(--ok)' : s >= 65 ? 'var(--warn)' : 'var(--cr)');
  return (
    <>
      <div className="page-h"><h1>Command Dashboard</h1><span className="live"><i />Auto-refresh every 10s · last {at}</span></div>
      <Msg m={err} />
      <div className="grid stats">
        <Stat label="Registered mines" value={t.mines} /><Stat label="Active mines" value={t.active} tone="good" /><Stat label="Under inspection" value={t.underInspection} tone="blue" />
        <Stat label="Compliance score" value={t.complianceScore + '%'} tone={t.complianceScore >= 85 ? 'good' : 'bad'} /><Stat label="Total violations" value={t.violations} tone="bad" />
        <Stat label="Pending approvals" value={t.pendingApprovals} tone="blue" /><Stat label="Open safety alerts" value={t.safetyAlerts} tone="bad" />
      </div>
      <div className="grid mb">
        <Card title="Monthly alerts and violations"><BarChart labels={d.months.map(m => m.slice(5))} series={[{ name: 'Alerts', values: d.monthly.alerts, color: '#12304f' }, { name: 'Violations', values: d.monthly.violations, color: '#ff6a13' }]} /><small className="muted">Month number on the x-axis. Navy: alerts, orange: violations.</small></Card>
        <Card title="Open alerts by severity"><Donut data={d.severity.map(s => ({ ...s, color: { Critical: '#e5484d', High: '#ea580c', Warning: '#f59e0b' }[s.label] }))} /></Card>
        <Card title="Environmental risk (latest PM10)"><Donut data={[{ label: 'Low', value: d.env.Low, color: '#1a9d57' }, { label: 'Moderate', value: d.env.Moderate, color: '#f59e0b' }, { label: 'High', value: d.env.High, color: '#e5484d' }]} /></Card>
      </div>
      <div className="grid">
        <Card title="Mine-wise compliance score">{d.minePerformance.map(m => <div key={m.name} style={{ marginBottom: 9 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{m.name} <Badge v={m.status} /></span><b>{m.score}%</b></div><div className="bar"><i style={{ width: m.score + '%', background: colour(m.score) }} /></div></div>)}</Card>
        <Card title="Recent alerts">{d.recentAlerts.length ? d.recentAlerts.map(a => <div className="item" key={a.id}><Badge v={a.severity} /> <b>{a.mineName}</b><br />{a.reason}<br /><small>Action: {a.action} · {a.date}</small></div>) : <p className="muted">No open alerts.</p>}</Card>
        <Card title="Recent activities">{d.recentActivity.map(a => <div className="item" key={a.id}>{a.action}<br /><small>{a.user} · {fmt(a.createdAt)}</small></div>)}</Card>
      </div>
    </>
  );
}
