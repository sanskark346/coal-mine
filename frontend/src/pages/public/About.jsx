import React from 'react';
import { Link } from 'react-router-dom';
import { PageHead } from '../../components/PublicLayout';

const roles = [['Admin', 'Approves mines, manages users and roles, answers grievances, reads the audit log and sees national-level dashboards.'], ['Mine Operator', 'Registers mines, submits sensor readings and worker grievances, and sees only the mines they own.'], ['Inspector', 'Sees every mine, runs compliance checks, starts and completes inspections and resolves alerts.']];
const problems = ['Paper records and spreadsheets are scattered across subsidiaries.', 'Overdue inspections and low PPE use are noticed late.', 'Gas and dust readings are not checked against limits in one place.', 'Worker complaints have no tracked status or response.'];

export default function About() {
  return (<>
    <PageHead tag="About" title="Why CoalGuard exists" sub="One platform that keeps mine registrations, sensor data, inspections, violations and grievances together so problems are seen early." />
    <div className="pbody"><div className="pin">
      <div className="two">
        <div><h2>The problem</h2><ul className="tick">{problems.map(p => <li key={p}>{p}</li>)}</ul></div>
        <div><h2>Our approach</h2><p>CoalGuard checks every reading and inspection date against transparent, configurable rules. Each alert states the reason, severity, recommended action and date, so officers can act and auditors can verify.</p><p>The platform is built with React, Node.js/Express and MongoDB, with a local JSON fallback so it runs on any laptop without paid services.</p></div>
      </div>
      <h2 style={{ marginTop: 34 }}>Who uses it</h2>
      <div className="grid">{roles.map(r => <div className="pcard" key={r[0]}><h3>{r[0]}</h3><span className="muted">{r[1]}</span></div>)}</div>
      <div className="note"><b>What is real and what is not.</b> All sensor values are simulated demonstration data. The compliance engine is rule-based with configurable thresholds; no trained AI model is connected, and there is no real sensor hardware or SMS/email integration.</div>
      <div className="btns"><Link to="/features" className="pbtn">See features</Link><Link to="/how-it-works" className="pbtn o">How it works</Link></div>
    </div></div>
  </>);
}
