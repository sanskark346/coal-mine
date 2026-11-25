import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHead } from '../../components/PublicLayout';

const Q = [
  ['Is the sensor data real?', 'No. All readings are simulated demonstration data. The platform is ready to accept readings through its API, but no hardware is connected.'],
  ['Is there a trained AI model?', 'No. The “AI compliance” feature is a rule-based engine with configurable thresholds, so every alert can be explained.'],
  ['What do I need to run it?', 'Node.js and a browser. MongoDB is optional: without it the backend saves data to a local JSON file.'],
  ['What demo accounts are available?', 'Admin (admin@coal.gov), Operator (operator@coal.gov) and Inspector (inspector@coal.gov). The passwords are on the login page.'],
  ['Who can see which mines?', 'Admins and inspectors see all mines. Operators see only the mines they registered.'],
  ['How do I get a PDF report?', 'Open Reports, choose a report and click Download PDF. In the print window choose “Save as PDF”.'],
  ['How are grievances handled?', 'Any logged-in user can submit one. The admin sets the status (Submitted, Under Review, Resolved, Rejected) and adds a response.'],
  ['Can I change the limits?', 'Yes. Edit the threshold values in backend/.env and restart the backend.']];

export default function FAQ() {
  const [open, setOpen] = useState(0);
  return (<>
    <PageHead tag="FAQ" title="Frequently asked questions" sub="Short, honest answers about what CoalGuard does and does not do." />
    <div className="pbody"><div className="pin narrow">
      {Q.map((q, i) => <div className={'faq' + (open === i ? ' on' : '')} key={q[0]}>
        <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}><span>{q[0]}</span><i>{open === i ? '−' : '+'}</i></button>
        {open === i && <div className="faq-a">{q[1]}</div>}
      </div>)}
      <p className="muted" style={{ marginTop: 20 }}>Still have a question? <Link to="/contact" style={{ color: 'var(--or)' }}>Contact the team</Link>.</p>
    </div></div>
  </>);
}
