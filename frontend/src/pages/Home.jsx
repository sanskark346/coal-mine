import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const features = [['Digital compliance tracking', 'Methane, air quality, PPE and inspection rules checked automatically against configured limits.'], ['Live mine monitoring', 'Sensor readings, equipment status and mine health for every registered mine.'], ['Alerts with reasons', 'Every alert shows the reason, severity, recommended action and date.'], ['Role-based access', 'Separate views for Admin, Mine Operator and Inspector.'], ['Reports in CSV and PDF', 'Daily, weekly, monthly, environmental, safety and violation reports.'], ['Grievance management', 'Workers submit complaints and the admin responds with a tracked status.']];
const steps = ['Operator registers the mine and the admin approves it', 'Sensor readings arrive from the field', 'The rule engine checks every reading and inspection date', 'Alerts and violations are raised with recommended actions', 'Admin and inspectors resolve them and export reports'];

export default function Home() {
  const [s, setS] = useState(null);
  useEffect(() => { api('/public/stats').then(setS).catch(() => {}); }, []);
  return (
    <div>
      <div className="hero">
        <div>
          <h1>Smart Governance. Safer Mines. Smarter Decisions.</h1>
          <p>A central platform for Coal India mines to monitor safety and environment sensors, check statutory compliance with transparent rules, and manage inspections, violations, reports and worker grievances.</p>
          <div className="btns"><Link className="btn" to="/login">Get Started</Link><Link className="btn o" to="/features">Explore Platform</Link></div>
        </div>
        <svg viewBox="0 0 400 260" role="img" aria-label="Open cast coal mine illustration">
          <rect width="400" height="260" rx="14" fill="#12304f" />
          <circle cx="320" cy="55" r="24" fill="#ff6a13" opacity=".9" />
          <path d="M0 260V150L70 120L130 150L200 100L270 160L330 130L400 170V260Z" fill="#1f2933" />
          <path d="M20 260L100 190L150 215L220 170L300 230L400 200V260Z" fill="#0f1720" />
          {[0, 1, 2, 3].map(i => <path key={i} d={`M${60 + i * 70} ${205 + i * 4}h52`} stroke="#ff6a13" strokeWidth="3" />)}
          <rect x="262" y="96" width="8" height="40" fill="#ff6a13" /><path d="M262 98L330 82" stroke="#ff6a13" strokeWidth="5" /><path d="M330 82V120" stroke="#cbd5e1" />
        </svg>
      </div>
      <div className="sec" id="about"><h2>About the platform</h2><p className="muted" style={{ maxWidth: 760 }}>Manual paperwork and scattered records make it hard to see which mines are at risk. CoalGuard keeps registrations, sensor data, inspections, violations and grievances in one place, so management can see problems early and act on them. <Link to="/about" style={{ color: 'var(--or)' }}>Read more</Link></p></div>
      <div className="sec"><h2>Live system numbers</h2><div className="grid" style={{ marginTop: 14 }}>
        {[['Registered mines', s?.mines], ['Open alerts', s?.openAlerts], ['Violations resolved', s?.violationsResolved], ['Sensor readings stored', s?.readings]].map(x => <div className="pcard" key={x[0]}><div className="big">{x[1] ?? '…'}</div>{x[0]}</div>)}
      </div><p className="muted">Counts come from the backend database and include demonstration data.</p></div>
      <div className="sec light" id="features"><div><h2>Key features and benefits</h2><p className="sub">Everything needed to monitor compliance in one system.</p><div className="grid">{features.map(f => <div className="pcard" key={f[0]}><h3>{f[0]}</h3><span className="muted">{f[1]}</span></div>)}</div></div></div>
      <div className="sec" id="how"><h2>How it works</h2><div className="grid" style={{ marginTop: 14 }}>{steps.map((t, i) => <div className="pcard" key={t}><b>Step {i + 1}</b><br /><span className="muted">{t}</span></div>)}</div></div>
      <div className="sec light"><div><h2>Why choose this platform</h2><p className="sub">Open rules, no black box.</p><div className="grid">{['Rules are configurable in the .env file, so every alert can be explained.', 'Works locally with MongoDB or a simple JSON file. No paid services.', 'Role-based access keeps operator data separate from admin controls.'].map(t => <div className="pcard" key={t}>{t}</div>)}</div></div></div>
      <div className="sec" id="contact"><h2>Contact</h2><p className="muted"><Link to="/contact" style={{ color: 'var(--or)' }}>Send us a message</Link> · SIH 2026 project team · coalguard.team@example.com · Problem statement: AI-Based Smart Governance and Compliance Monitoring System for Coal Mines (Ministry of Coal).</p></div>
    </div>
  );
}
