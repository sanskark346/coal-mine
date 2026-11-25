const db = require('../models');
const { httpError, need, log } = require('../utils/helpers');
exports.create = async (req, res) => {
  const b = req.body; need(b, ['subject', 'description', 'category']);
  if (b.description.trim().length < 10) throw httpError(400, 'Please describe the problem in at least 10 characters');
  const g = await db.grievances.create({ subject: b.subject.trim(), category: b.category, description: b.description.trim(), mineId: b.mineId || null, userId: req.user.id, userName: req.user.name, status: 'Submitted', response: '' });
  await log(req.user, `Submitted grievance "${g.subject}"`);
  res.status(201).json(g);
};
exports.list = async (req, res) => {
  const all = await db.grievances.find();
  res.json((req.user.role === 'admin' ? all : all.filter(g => g.userId === req.user.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
};
exports.respond = async (req, res) => {
  const g = await db.grievances.get(req.params.id); if (!g) throw httpError(404, 'Grievance not found');
  if (!['Submitted', 'Under Review', 'Resolved', 'Rejected'].includes(req.body.status)) throw httpError(400, 'Invalid status');
  const out = await db.grievances.update(g.id, { status: req.body.status, response: (req.body.response || '').trim(), respondedBy: req.user.name });
  await log(req.user, `Set grievance "${g.subject}" to ${req.body.status}`);
  res.json(out);
};
