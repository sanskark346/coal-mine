import React from 'react';

export function BarChart({ labels, series, height = 170 }) {
  const W = 420, p = 28, H = height, m = Math.max(1, ...series.flatMap(s => s.values)), bw = (W - p) / labels.length, sw = (bw * 0.7) / series.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="chart" role="img">
      {[0, 0.5, 1].map(f => <g key={f}><line x1={p} x2={W} y1={H - f * (H - 10)} y2={H - f * (H - 10)} className="gl" /><text x="0" y={H - f * (H - 10) + 4} className="ax">{Math.round(m * f)}</text></g>)}
      {labels.map((l, i) => <g key={l + i}>
        {series.map((s, j) => { const h = (s.values[i] / m) * (H - 10); return <rect key={j} x={p + i * bw + bw * 0.15 + j * sw} y={H - h} width={sw - 2} height={h} fill={s.color} rx="2"><title>{s.name}: {s.values[i]}</title></rect>; })}
        <text x={p + i * bw + bw / 2} y={H + 15} textAnchor="middle" className="ax">{l}</text>
      </g>)}
    </svg>
  );
}
export function Donut({ data }) {
  const tot = data.reduce((s, d) => s + d.value, 0), R = 40, C = 2 * Math.PI * R; let off = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 100 100" width="140">
        {tot === 0 && <circle cx="50" cy="50" r={R} fill="none" stroke="#2a3a52" strokeWidth="16" />}
        {data.map(d => { const len = (d.value / (tot || 1)) * C; const el = <circle key={d.label} cx="50" cy="50" r={R} fill="none" stroke={d.color} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 50 50)"><title>{d.label}: {d.value}</title></circle>; off += len; return el; })}
        <text x="50" y="55" textAnchor="middle" className="dt">{tot}</text>
      </svg>
      <ul>{data.map(d => <li key={d.label}><i style={{ background: d.color }} />{d.label}: <b>{d.value}</b></li>)}</ul>
    </div>
  );
}
export function LineChart({ values, labels, color = '#ff6a13', limit, unit = '' }) {
  if (!values.length) return <p className="muted">No readings yet.</p>;
  const W = 420, H = 130, mx = Math.max(...values, limit || 0) * 1.1 || 1, st = W / Math.max(1, values.length - 1), y = v => H - (v / mx) * H + 5;
  return (
    <svg viewBox={`0 0 ${W} ${H + 12}`} className="chart">
      {limit != null && <g><line x1="0" x2={W} y1={y(limit)} y2={y(limit)} stroke="#e5484d" strokeDasharray="5 4" /><text x="2" y={y(limit) - 3} className="ax">limit {limit}{unit}</text></g>}
      <polyline fill="none" stroke={color} strokeWidth="2.5" points={values.map((v, i) => `${i * st},${y(v)}`).join(' ')} />
      {values.map((v, i) => <circle key={i} cx={i * st} cy={y(v)} r="3" fill={color}><title>{labels?.[i]}: {v}{unit}</title></circle>)}
    </svg>
  );
}
