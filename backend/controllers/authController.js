const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const { httpError, need, log, safeUser } = require('../utils/helpers');
const sign = u => jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '8h' });

exports.register = async (req, res) => {
  const b = req.body; need(b, ['name', 'email', 'password', 'role']);
  if (!/^\S+@\S+\.\S+$/.test(b.email)) throw httpError(400, 'Enter a valid email address');
  if (String(b.password).length < 6) throw httpError(400, 'Password must be at least 6 characters');
  if (!['operator', 'inspector'].includes(b.role)) throw httpError(400, 'Self registration is only for operator or inspector');
  const email = b.email.toLowerCase().trim();
  if ((await db.users.find({ email })).length) throw httpError(409, 'This email is already registered');
  const u = await db.users.create({ name: b.name.trim(), email, role: b.role, organisation: (b.organisation || '').trim(), active: true, password: await bcrypt.hash(b.password, 10) });
  await log(u, 'Registered a new account');
  res.status(201).json({ token: sign(u), user: safeUser(u) });
};
exports.login = async (req, res) => {
  need(req.body, ['email', 'password']);
  const u = (await db.users.find({ email: req.body.email.toLowerCase().trim() }))[0];
  if (!u || !(await bcrypt.compare(req.body.password, u.password))) throw httpError(401, 'Wrong email or password');
  if (u.active === false) throw httpError(403, 'This account has been disabled by the admin');
  await log(u, 'Logged in');
  res.json({ token: sign(u), user: safeUser(u) });
};
exports.me = async (req, res) => res.json(safeUser(req.user));
exports.listUsers = async (req, res) => res.json((await db.users.find()).map(safeUser));
exports.patchUser = async (req, res) => {
  const u = await db.users.get(req.params.id); if (!u) throw httpError(404, 'User not found');
  if (u.id === req.user.id) throw httpError(400, 'You cannot change your own role or status');
  const p = {};
  if (req.body.role !== undefined) { if (!['admin', 'operator', 'inspector'].includes(req.body.role)) throw httpError(400, 'Invalid role'); p.role = req.body.role; }
  if (req.body.active !== undefined) p.active = !!req.body.active;
  const out = await db.users.update(u.id, p);
  await log(req.user, `Updated user ${u.email}`);
  res.json(safeUser(out));
};
exports.deleteUser = async (req, res) => {
  const u = await db.users.get(req.params.id); if (!u) throw httpError(404, 'User not found');
  if (u.id === req.user.id) throw httpError(400, 'You cannot delete your own account');
  await db.users.remove(u.id); await log(req.user, `Deleted user ${u.email}`);
  res.json({ ok: true });
};
