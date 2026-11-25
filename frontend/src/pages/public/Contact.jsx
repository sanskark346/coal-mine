import React, { useState } from 'react';
import { PageHead } from '../../components/PublicLayout';
import { api } from '../../api';
import { Msg } from '../../components/ui';

export default function Contact() {
  const [f, setF] = useState({ name: '', email: '', topic: 'General question', message: '' });
  const [m, setM] = useState(null), [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setM(null);
    if (f.name.trim().length < 2) return setM({ type: 'err', text: 'Enter your name.' });
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setM({ type: 'err', text: 'Enter a valid email address.' });
    if (f.message.trim().length < 10) return setM({ type: 'err', text: 'Write at least 10 characters in the message.' });
    setBusy(true);
    try { await api('/public/contact', { method: 'POST', body: f }); setM({ type: 'ok', text: 'Thank you. Your message was saved and the team will read it.' }); setF({ name: '', email: '', topic: 'General question', message: '' }); }
    catch (err) { setM({ type: 'err', text: err.message }); } finally { setBusy(false); }
  }
  return (<>
    <PageHead tag="Contact" title="Talk to the team" sub="Questions, feedback or a demo request. We read every message." />
    <div className="pbody"><div className="pin two">
      <form className="card" onSubmit={submit}>
        <Msg m={m} />
        <div className="form" style={{ gridTemplateColumns: '1fr' }}>
          <div><label>Name</label><input value={f.name} onChange={set('name')} /></div>
          <div><label>Email</label><input type="email" value={f.email} onChange={set('email')} /></div>
          <div><label>Topic</label><select value={f.topic} onChange={set('topic')}><option>General question</option><option>Request a demo</option><option>Report a problem</option><option>Feedback</option></select></div>
          <div><label>Message</label><textarea rows="5" value={f.message} onChange={set('message')} /></div>
          <button disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
        </div>
      </form>
      <div>
        <div className="pcard"><h3>Project team</h3><span className="muted">SIH 2026 · coalguard.team@example.com</span></div>
        <div className="pcard" style={{ marginTop: 14 }}><h3>Problem statement</h3><span className="muted">AI-Based Smart Governance and Compliance Monitoring System for Coal Mines (Ministry of Coal).</span></div>
        <div className="pcard" style={{ marginTop: 14 }}><h3>Worker grievance?</h3><span className="muted">Registered users can submit and track a grievance from Reports &amp; Grievances after login.</span></div>
      </div>
    </div></div>
  </>);
}
