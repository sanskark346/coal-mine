import React from 'react';
import { Link } from 'react-router-dom';
import { PageHead } from '../../components/PublicLayout';

const rules = [
  ['Methane', 'Safety', '≥ 0.75 %', '≥ 1.25 %', 'Evacuate, switch off electrical equipment, ventilate and re-test.'],
  ['PM10 dust', 'Environmental', '≥ 100 µg/m³', '≥ 250 µg/m³', 'Dust suppression, stop blasting, notify the environment officer.'],
  ['Temperature', 'Safety', '≥ 37 °C', '–', 'Check ventilation, provide water and rotate workers.'],
  ['Water pH', 'Environmental', 'Outside 6.5–8.5', '–', 'Treat mine water before discharge and take a lab sample.'],
  ['PPE compliance', 'Safety', 'Below 90 %', '–', 'Run a PPE audit and hold a safety briefing.'],
  ['Safety inspection', 'Compliance', 'Past the mine’s inspection interval', '–', 'Schedule the statutory inspection within 48 hours.']];

export default function SafetyStandards() {
  return (<>
    <PageHead tag="Safety standards" title="The rules behind every alert" sub="Open thresholds, no black box. These are the default values used by the compliance engine." />
    <div className="pbody"><div className="pin">
      <div className="card tw"><table><thead><tr><th>Rule</th><th>Category</th><th>Warning / trigger</th><th>Critical</th><th>Recommended action</th></tr></thead>
        <tbody>{rules.map(r => <tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td>{r[4]}</td></tr>)}</tbody></table></div>
      <div className="note"><b>Configurable.</b> Methane, PM10, temperature and PPE limits are set in <code>backend/.env</code> (METHANE_WARN, METHANE_CRIT, PM10_WARN, PM10_CRIT, TEMP_WARN, PPE_MIN). The inspection interval is stored per mine. These are demonstration defaults and should be set to the limits in the applicable statutory rules before real use.</div>
      <h2 style={{ marginTop: 30 }}>Severity levels</h2>
      <div className="grid">
        <div className="pcard"><span className="badge Warning">Warning</span><p className="muted">Early sign. Monitor and correct. Reduces score by 5.</p></div>
        <div className="pcard"><span className="badge High">High</span><p className="muted">Compliance gap such as an overdue inspection or low PPE. Reduces score by 10.</p></div>
        <div className="pcard"><span className="badge Critical">Critical</span><p className="muted">Immediate danger. Act now. Reduces score by 20.</p></div>
      </div>
      <div className="btns"><Link to="/login" className="pbtn">See alerts in the demo</Link></div>
    </div></div>
  </>);
}
