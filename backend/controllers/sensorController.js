const db = require('../models');
const { httpError, need, num, log, visibleMines, readingsOf } = require('../utils/helpers');
const { processReading } = require('../utils/compliance');

async function store(mine, r, source) {
  const reading = await db.sensors.create({ mineId: mine.id, ...r, source });
  const alerts = await processReading(mine, reading);
  return { reading, alerts };
}
exports.list = async (req, res) => {
  const mines = await visibleMines(req.user);
  if (!req.query.mineId) throw httpError(400, 'mineId is required');
  if (!mines.some(m => m.id === req.query.mineId)) throw httpError(404, 'Mine not found');
  res.json((await readingsOf(req.query.mineId)).slice(-40));
};
exports.create = async (req, res) => {
  const b = req.body; need(b, ['mineId', 'methane', 'pm10', 'temperature', 'humidity', 'ph']);
  const mine = (await visibleMines(req.user)).find(m => m.id === b.mineId);
  if (!mine) throw httpError(404, 'Mine not found or not yours');
  const r = { methane: num(b.methane, 'Methane', 0, 100), pm10: num(b.pm10, 'PM10', 0, 1000), temperature: num(b.temperature, 'Temperature', -10, 80), humidity: num(b.humidity, 'Humidity', 0, 100), ph: num(b.ph, 'pH', 0, 14) };
  const out = await store(mine, r, 'manual');
  await log(req.user, `Submitted a sensor reading for ${mine.name}`);
  res.status(201).json(out);
};
// Demonstration only: random values, 1 in 6 readings is a deliberate spike so alerts can be seen.
exports.simulate = async (req, res) => {
  const rnd = (a, b, d = 2) => +(a + Math.random() * (b - a)).toFixed(d);
  const mines = (await visibleMines(req.user)).filter(m => m.approval === 'Approved');
  const created = [];
  for (const m of mines) {
    const spike = Math.random() < 1 / 6;
    const r = { methane: spike ? rnd(0.8, 1.6) : rnd(0.2, 0.6), pm10: spike ? rnd(110, 280, 0) : rnd(45, 95, 0), temperature: rnd(26, spike ? 40 : 34, 1), humidity: rnd(55, 85, 0), ph: Math.random() < 0.08 ? rnd(5.6, 6.3, 1) : rnd(6.7, 8.1, 1) };
    created.push(...(await store(m, r, 'simulated')).alerts);
  }
  await log(req.user, `Ran simulated sensor readings for ${mines.length} mines`);
  res.json({ readings: mines.length, newAlerts: created.length, alerts: created });
};
