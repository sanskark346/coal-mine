const jwt = require('jsonwebtoken');
const db = require('../models');
exports.auth = async (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) return res.status(401).json({ message: 'Please login first' });
    const p = jwt.verify(h.slice(7), process.env.JWT_SECRET);
    const u = await db.users.get(p.id);
    if (!u || u.active === false) return res.status(401).json({ message: 'Account is not available' });
    req.user = u; next();
  } catch (e) { res.status(401).json({ message: 'Session expired. Please login again.' }); }
};
exports.allow = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Your role is not allowed to do this' });
