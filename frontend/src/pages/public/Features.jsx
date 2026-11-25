import React from 'react';
import { Link } from 'react-router-dom';
import { PageHead } from '../../components/PublicLayout';

const F = [
  ['◉', 'Live mine monitoring', 'Methane, PM10, temperature, humidity and water pH per mine, with equipment status and an overall mine health indicator. Live simulation refreshes readings on screen.'],
  ['✔', 'Rule-based compliance checks', 'Readings, PPE levels and inspection dates are checked against configured limits. Violations and warnings are raised automatically.'],
  ['⚠', 'Alerts with reasons', 'Every alert carries the reason, severity (Warning, High, Critical), recommended action and date, and can be resolved or reopened.'],
  ['▦', 'Dashboard and charts', 'KPI cards, monthly violation trends, severity split and air-quality levels. Refreshes every 10 seconds.'],
  ['☰', 'Reports in CSV and PDF', 'Daily, weekly, monthly, environmental, safety and violation reports with search. CSV from the server, PDF through the print dialog.'],
  ['✉', 'Grievance management', 'Workers submit complaints; the admin sets a status and writes a response that the worker can read.'],
  ['⛨', 'Role-based access', 'Admin, Mine Operator and Inspector each see only what they need. JWT-secured API.'],
  ['✎', 'Audit log', 'Important actions are recorded with the user, role and time so decisions can be traced.']];

export default function Features() {
  return (<>
    <PageHead tag="Features" title="Everything needed to monitor compliance" sub="Eight capabilities that work together, from sensor reading to final report." />
    <div className="pbody"><div className="pin">
      <div className="grid">{F.map(f => <div className="pcard" key={f[1]}><div className="ico">{f[0]}</div><h3>{f[1]}</h3><span className="muted">{f[2]}</span></div>)}</div>
      <div className="btns"><Link to="/login" className="pbtn">Try the demo</Link><Link to="/safety-standards" className="pbtn o">View the rules</Link></div>
    </div></div>
  </>);
}
