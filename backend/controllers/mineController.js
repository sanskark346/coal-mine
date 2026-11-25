const db = require('../models');
const { httpError, need, num, log, visibleMines } = require('../utils/helpers');
const { checkMine } = require('../utils/compliance');
const today = () => new Date().toISOString().slice(0, 10);

function parse(b, partial) {
  const o = {};
  if (!partial) need(b, ['name', 'code', 'subsidiary', 'state']);
  for (const k of ['name', 'code', 'subsidiary', 'state']) if (b[k] !== undefined) { if (!String(b[k]).trim()) throw httpError(400, k + ' cannot be empty'); o[k] = String(b[k]).trim(); }
  const ranges = { lat: [6, 38], lon: [68, 98], production: [0, 1e6], workers: [0, 1e5], ppeCompliance: [0, 100], inspectionIntervalDays: [1, 365] };
  for (const k in ranges) if (b[k] !== undefined) o[k] = num(b[k], k, ...ranges[k]);
  if (!partial) for (const k of ['lat', 'lon']) if (o[k] === undefined) throw httpError(400, 'Missing or empty: ' + k);
  if (Array.isArray(b.equipment)) o.equipment = b.equipment.map(e => ({ name: String(e.name).trim(), status: ['Operational', 'Maintenance', 'Faulty'].includes(e.status) ? e.status : 'Operational' })).filter(e => e.name);
  return o;
}
exports.list = async (req, res) => res.json(await visibleMines(req.user));
exports.get = async (req, res) => {
  const m = (await visibleMines(req.user)).find(x => x.id === req.params.id);
  if (!m) throw httpError(404, 'Mine not found'); res.json(m);
};
exports.create = async (req, res) => {
  const o = parse(req.body);
  if ((await db.mines.find()).some(m => m.code.toLowerCase() === o.code.toLowerCase())) throw httpError(409, 'A mine with this code already exists');
  const admin = req.user.role === 'admin';
  const m = await db.mines.create({ production: 0, workers: 0, ppeCompliance: 95, inspectionIntervalDays: 30, equipment: [], ...o, operatorId: admin ? (req.body.operatorId || null) : req.user.id, operatorName: admin ? (req.body.operatorName || 'Not assigned') : req.user.name,
    status: 'Active', approval: admin ? 'Approved' : 'Pending', underInspection: false, lastInspection: today(), complianceScore: 100 });
  await log(req.user, `Registered mine ${m.name} (${m.approval})`);
  res.status(201).json(m);
};
exports.update = async (req, res) => {
  if (!(await db.mines.get(req.params.id))) throw httpError(404, 'Mine not found');
  const m = await db.mines.update(req.params.id, parse(req.body, true));
  await checkMine(m); await log(req.user, `Updated mine ${m.name}`);
  res.json(await db.mines.get(m.id));
};
exports.remove = async (req, res) => {
  const m = await db.mines.get(req.params.id); if (!m) throw httpError(404, 'Mine not found');
  for (const a of await db.alerts.find({ mineId: m.id })) await db.alerts.remove(a.id);
  for (const s of await db.sensors.find({ mineId: m.id })) await db.sensors.remove(s.id);
  await db.mines.remove(m.id); await log(req.user, `Deleted mine ${m.name}`);
  res.json({ ok: true });
};
exports.approval = async (req, res) => {
  const { decision } = req.body;
  if (!['Approved', 'Rejected'].includes(decision)) throw httpError(400, 'Decision must be Approved or Rejected');
  if (!(await db.mines.get(req.params.id))) throw httpError(404, 'Mine not found');
  const m = await db.mines.update(req.params.id, { approval: decision });
  await log(req.user, `${decision} mine ${m.name}`); res.json(m);
};
exports.inspect = async (req, res) => {
  const m = await db.mines.get(req.params.id); if (!m) throw httpError(404, 'Mine not found');
  const { action } = req.body;
  if (!['start', 'complete'].includes(action)) throw httpError(400, 'Action must be start or complete');
  const upd = action === 'start' ? { underInspection: true } : { underInspection: false, lastInspection: today() };
  await db.mines.update(m.id, upd);
  if (action === 'complete') await checkMine(m);
  await log(req.user, `${action === 'start' ? 'Started' : 'Completed'} inspection at ${m.name}`);
  res.json(await db.mines.get(m.id));
};
