const db = require('../models');
const httpError = (status, message) => Object.assign(new Error(message), { status });
exports.httpError = httpError;
exports.need = (b, fields) => {
  const miss = fields.filter(k => b[k] === undefined || b[k] === null || String(b[k]).trim() === '');
  if (miss.length) throw httpError(400, 'Missing or empty: ' + miss.join(', '));
};
exports.num = (v, name, min, max) => {
  const x = Number(v);
  if (v === '' || v === null || !Number.isFinite(x) || x < min || x > max) throw httpError(400, `${name} must be a number between ${min} and ${max}`);
  return x;
};
exports.wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
exports.log = (u, action) => db.activity.create({ user: u ? u.name : 'System', role: u ? u.role : 'system', action });
exports.safeUser = ({ password, ...u }) => u;
exports.visibleMines = async u => {
  const all = await db.mines.find();
  return u.role === 'operator' ? all.filter(m => m.operatorId === u.id) : all;
};
exports.readingsOf = async id => (await db.sensors.find({ mineId: id })).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
exports.latestReading = async id => { const r = await exports.readingsOf(id); return r[r.length - 1] || null; };
