const db = require('../models');
const { httpError, log, visibleMines } = require('../utils/helpers');
const { checkMine, T, risk } = require('../utils/compliance');

exports.check = async (req, res) => {
  const mines = (await visibleMines(req.user)).filter(m => m.approval === 'Approved');
  const created = [];
  for (const m of mines) created.push(...(await checkMine(m)));
  await log(req.user, `Ran compliance check on ${mines.length} mines: ${created.length} new alerts`);
  res.json({ checked: mines.length, newAlerts: created.length, alerts: created });
};
exports.summary = async (req, res) => {
  const mines = await visibleMines(req.user);
  const alerts = await db.alerts.find();
  const rows = mines.map(m => {
    const open = alerts.filter(a => a.mineId === m.id && a.status === 'Open');
    const all = alerts.filter(a => a.mineId === m.id && a.isViolation);
    const score = m.complianceScore ?? 100;
    const top = open.sort((a, b) => (b.severity === 'Critical') - (a.severity === 'Critical'))[0];
    return { mineId: m.id, name: m.name, status: m.status, score, risk: risk(score), openAlerts: open.length, violationsTotal: all.length,
      analysis: open.length ? `${m.name} has ${open.length} open issue(s). Main concern: ${top.reason}.` : `${m.name} has no open issues. Keep inspections on schedule.`,
      recommendations: [...new Set(open.map(a => a.action))] };
  });
  res.json({ method: 'Rule-based analysis using configured thresholds (no trained AI model)', thresholds: T(), mines: rows });
};
exports.alerts = async (req, res) => {
  const ids = new Set((await visibleMines(req.user)).map(m => m.id));
  res.json((await db.alerts.find()).filter(a => ids.has(a.mineId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
};
exports.patchAlert = async (req, res) => {
  const a = await db.alerts.get(req.params.id); if (!a) throw httpError(404, 'Alert not found');
  if (!['Open', 'Resolved'].includes(req.body.status)) throw httpError(400, 'Status must be Open or Resolved');
  const out = await db.alerts.update(a.id, { status: req.body.status, resolvedAt: req.body.status === 'Resolved' ? new Date().toISOString() : null, note: req.body.note || a.note });
  const open = await db.alerts.find({ mineId: a.mineId, status: 'Open' });
  const { score } = require('../utils/compliance');
  await db.mines.update(a.mineId, { complianceScore: score(open), status: open.some(x => x.severity === 'Critical') ? 'Critical' : open.length ? 'Warning' : 'Active' });
  await log(req.user, `Marked alert "${a.reason.slice(0, 40)}" as ${req.body.status}`);
  res.json(out);
};
exports.deleteAlert = async (req, res) => {
  if (!(await db.alerts.get(req.params.id))) throw httpError(404, 'Alert not found');
  await db.alerts.remove(req.params.id); await log(req.user, 'Deleted an alert'); res.json({ ok: true });
};
