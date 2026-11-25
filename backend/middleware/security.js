// CORS allow-list and a tiny in-memory rate limiter (no extra packages needed).
const isProd = () => process.env.NODE_ENV === 'production';

// CORS_ORIGINS="https://coal-mine-j6sb.vercel.app,https://*.vercel.app"  (comma separated, * wildcard allowed)
exports.corsOptions = () => {
  const list = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
  const rx = list.map(p => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+') + '$'));
  if (!list.length) console.warn(isProd() ? 'CORS_ORIGINS is not set: any website may call this API. Set it to your Vercel URL.' : 'CORS_ORIGINS not set: allowing all origins (development).');
  return {
    origin(origin, cb) {
      if (!origin || !list.length) return cb(null, true);               // server-to-server, curl, or not configured
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) && !isProd()) return cb(null, true);
      cb(null, rx.some(r => r.test(origin)));                            // false => browser blocks it
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600
  };
};

exports.rateLimit = (max, windowMs, message) => {
  const hits = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k); }, windowMs).unref();
  return (req, res, next) => {
    const k = req.ip || 'unknown', now = Date.now();
    let h = hits.get(k); if (!h || h.reset < now) { h = { n: 0, reset: now + windowMs }; hits.set(k, h); }
    if (++h.n > max) return res.status(429).json({ message });
    next();
  };
};
