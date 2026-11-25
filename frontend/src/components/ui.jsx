import React from 'react';
export const Badge = ({ v }) => <span className={'badge ' + String(v).replace(/\s/g, '')}>{v}</span>;
export const Stat = ({ label, value, tone, note }) => <div className={'card stat ' + (tone || '')}><small>{label}</small><b>{value}</b>{note && <em>{note}</em>}</div>;
export const Card = ({ title, right, children, className = '' }) => <section className={'card ' + className}>{(title || right) && <div className="card-h"><h3>{title}</h3>{right}</div>}{children}</section>;
export const Spinner = () => <div className="spin">Loading…</div>;
export const Msg = ({ m }) => (m ? <div className={'msg ' + m.type}>{m.text}</div> : null);
export const fmt = s => (s ? String(s).slice(0, 16).replace('T', ' ') : '-');
