const db = require('../models');
const { httpError, visibleMines, latestReading } = require('../utils/helpers');
const { T } = require('../utils/compliance');
const since = d => new Date(Date.now() - d * 864e5).toISOString();
const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
const avg = a => (a.length ? +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2) : 0);

exports.publicStats = async (req, res) => {
  const mines = await db.mines.find(), alerts = await db.alerts.find();
  res.json({ mines: mines.length, openAlerts: alerts.filter(a => a.status === 'Open').length, violationsResolved: alerts.filter(a => a.isViolation && a.status === 'Resolved').length, readings: (await db.sensors.find()).length });
};
exports.contact = async (req, res) => {
  const b = req.body || {}, name = String(b.name || '').trim(), email = String(b.email || '').trim(), message = String(b.message || '').trim();
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || message.length < 10) throw httpError(400, 'Please enter your name, a valid email and a message of at least 10 characters');
  await db.contacts.create({ name: name.slice(0, 100), email: email.slice(0, 150), topic: String(b.topic || 'General question').slice(0, 60), message: message.slice(0, 2000) });
  res.status(201).json({ ok: true });
};
exports.dashboard = async (req, res) => {
  const mines = await visibleMines(req.user), ids = new Set(mines.map(m => m.id));
  const alerts = (await db.alerts.find()).filter(a => ids.has(a.mineId)), open = alerts.filter(a => a.status === 'Open');
  const approved = mines.filter(m => m.approval === 'Approved');
  const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
  const t = T(), env = { Low: 0, Moderate: 0, High: 0 };
  for (const m of approved) { const r = await latestReading(m.id); if (r) env[r.pm10 >= t.pm10Crit ? 'High' : r.pm10 >= t.pm10Warn ? 'Moderate' : 'Low']++; }
  const recent = (await db.activity.find()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  res.json({
    totals: { mines: mines.length, active: mines.filter(m => m.status === 'Active' && m.approval === 'Approved').length, underInspection: mines.filter(m => m.underInspection).length,
      complianceScore: approved.length ? Math.round(avg(approved.map(m => m.complianceScore ?? 100))) : 100, violations: alerts.filter(a => a.isViolation).length,
      pendingApprovals: mines.filter(m => m.approval === 'Pending').length, safetyAlerts: open.filter(a => a.category === 'Safety').length },
    months, monthly: { violations: months.map(k => alerts.filter(a => a.isViolation && a.createdAt.startsWith(k)).length), alerts: months.map(k => alerts.filter(a => a.createdAt.startsWith(k)).length) },
    severity: ['Critical', 'High', 'Warning'].map(s => ({ label: s, value: open.filter(a => a.severity === s).length })),
    env, minePerformance: approved.map(m => ({ name: m.name, score: m.complianceScore ?? 100, status: m.status })),
    recentAlerts: open.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6), recentActivity: recent
  });
};
exports.activity = async (req, res) => res.json((await db.activity.find()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 60));

async function build(type, q, user) {
  const mines = await visibleMines(user), ids = new Set(mines.map(m => m.id)), name = Object.fromEntries(mines.map(m => [m.id, m.name]));
  const days = { daily: 1, weekly: 7, monthly: 30 }[type] || Number(q.days) || 30, from = since(days);
  const alerts = (await db.alerts.find()).filter(a => ids.has(a.mineId) && a.createdAt >= from);
  const reads = (await db.sensors.find()).filter(s => ids.has(s.mineId) && s.createdAt >= from);
  const R = (title, columns, rows) => ({ title, columns, rows });
  if (type === 'daily') return R('Daily monitoring report (last 24 hours)', ['Time', 'Mine', 'Methane %', 'PM10', 'Temp °C', 'Humidity %', 'pH', 'Source'], reads.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(s => [s.createdAt.slice(0, 16).replace('T', ' '), name[s.mineId], s.methane, s.pm10, s.temperature, s.humidity, s.ph, s.source]));
  if (type === 'weekly' || type === 'monthly') return R(`${type === 'weekly' ? 'Weekly' : 'Monthly'} compliance report (last ${days} days)`, ['Mine', 'Score', 'Status', 'Alerts', 'Violations', 'Critical'], mines.map(m => { const a = alerts.filter(x => x.mineId === m.id); return [m.name, m.complianceScore ?? 100, m.status, a.length, a.filter(x => x.isViolation).length, a.filter(x => x.severity === 'Critical').length]; }));
  if (type === 'mine-performance') return R('Mine-wise performance report', ['Mine', 'Subsidiary', 'Production t/day', 'Workers', 'PPE %', 'Score', 'Status', 'Open alerts', 'Last inspection'], await Promise.all(mines.map(async m => [m.name, m.subsidiary, m.production, m.workers, m.ppeCompliance, m.complianceScore ?? 100, m.status, (await db.alerts.find({ mineId: m.id, status: 'Open' })).length, m.lastInspection])));
  if (type === 'environmental') return R(`Environmental report (last ${days} days)`, ['Mine', 'Readings', 'Avg PM10', 'Avg Temp °C', 'Avg Humidity %', 'Avg pH', 'Env alerts'], mines.map(m => { const r = reads.filter(x => x.mineId === m.id); return [m.name, r.length, avg(r.map(x => x.pm10)), avg(r.map(x => x.temperature)), avg(r.map(x => x.humidity)), avg(r.map(x => x.ph)), alerts.filter(a => a.mineId === m.id && a.category === 'Environmental').length]; }));
  if (type === 'safety' || type === 'violations') {
    const rows = alerts.filter(a => (type === 'safety' ? a.category === 'Safety' : a.isViolation)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return R(type === 'safety' ? `Safety report (last ${days} days)` : `Violation report (last ${days} days)`, ['Date', 'Mine', 'Category', 'Severity', 'Reason', 'Recommended action', 'Status'], rows.map(a => [a.date, a.mineName, a.category, a.severity, a.reason, a.action, a.status]));
  }
  throw httpError(404, 'Unknown report type');
}
exports.report = async (req, res) => {
  const r = await build(req.params.type, req.query, req.user);
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}-report.csv"`);
    return res.send('\uFEFF' + [r.columns, ...r.rows].map(row => row.map(esc).join(',')).join('\n'));
  }
  res.json({ ...r, generatedAt: new Date().toISOString() });
};
