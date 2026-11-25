import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth, homeFor } from '../auth';

export const PUBLIC_LINKS = [['/', 'Home'], ['/about', 'About'], ['/features', 'Features'], ['/how-it-works', 'How it works'], ['/safety-standards', 'Safety standards'], ['/faq', 'FAQ'], ['/contact', 'Contact']];

export default function PublicLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); setOpen(false); }, [pathname]);
  return (
    <div className="pub">
      <header className="pnav">
        <Link to="/" className="brand">⛏ CoalGuard</Link>
        <button className="ghost pmenu" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>{open ? '✕' : '☰'}</button>
        <nav className={'plinks' + (open ? ' open' : '')}>
          {PUBLIC_LINKS.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}
          <Link to={user ? homeFor(user.role) : '/login'} className="pcta">{user ? 'Open dashboard' : 'Login'}</Link>
        </nav>
      </header>
      <main><Outlet /></main>
      <footer className="pfoot">
        <div className="pfoot-in">
          <div><b className="brand" style={{ padding: 0 }}>⛏ CoalGuard</b><p>AI-based smart governance and compliance monitoring for coal mines. SIH 2026 project.</p></div>
          <div><b>Pages</b>{PUBLIC_LINKS.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}</div>
          <div><b>Platform</b><Link to="/login">Login / Register</Link><Link to="/contact">Report a problem</Link><span>Sensor data is simulated demonstration data.</span></div>
        </div>
        <div className="pfoot-b">© 2026 CoalGuard · Problem statement: AI-Based Smart Governance and Compliance Monitoring System for Coal Mines (Ministry of Coal)</div>
      </footer>
    </div>
  );
}

export function PageHead({ title, sub, tag }) {
  useEffect(() => { document.title = title + ' – CoalGuard'; }, [title]);
  return <div className="phead"><div>{tag && <span className="ptag">{tag}</span>}<h1>{title}</h1>{sub && <p>{sub}</p>}</div></div>;
}
