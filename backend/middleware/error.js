exports.notFound = (req, res) => res.status(404).json({ message: 'Route not found' });
exports.errorHandler = (e, req, res, next) => {
  const st = e.status || 500;
  if (st === 500) console.error(e);
  res.status(st).json({ message: st === 500 ? 'Server error. Check the backend terminal for details.' : e.message });
};
