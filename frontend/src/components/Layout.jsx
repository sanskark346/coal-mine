import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../auth';

const LINKS = [['/dashboard', '▦', 'Dashboard', ['admin', 'operator', 'inspector']], ['/monitoring', '◉', 'Mine Monitoring', ['admin', 'operator', 'inspector']], ['/compliance', '✔', 'AI Compliance', ['admin', 'operator', 'inspector']], ['/reports', '☰', 'Reports & Grievances', ['admin', 'operator', 'inspector']], ['/admin', '⚙', 'Admin Panel', ['admin']]];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="app">
      <aside className={'side ' + (open ? 'open' : '')}>
        <Link to="/" className="brand">⛏ CoalGuard</Link>
        <nav onClick={() => setOpen(false)}>{LINKS.filter(l => l[3].includes(user.role)).map(l => <NavLink key={l[0]} to={l[0]}><span>{l[1]}</span>{l[2]}</NavLink>)}</nav>
        <div className="side-f">Signed in as<br /><b>{user.name}</b><br /><small>{user.role}</small></div>
      </aside>
      <div className="main">
        <header className="top">
          <button className="ghost menu" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
          <span className="sim-tag">Sensor data is simulated demonstration data</span>
          <span className="grow" />
          <button className="ghost" onClick={logout}>Logout</button>
        </header>
        <div className="content"><Outlet /></div>
        <footer className="foot">CoalGuard · SIH 2026 · AI-Based Smart Governance and Compliance Monitoring for Coal Mines</footer>
      </div>
    </div>
  );
}
