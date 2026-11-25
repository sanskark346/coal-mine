require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const isProd = process.env.NODE_ENV === 'production';

// --- required settings ---------------------------------------------------------------
if (!process.env.JWT_SECRET) {
  if (isProd) { console.error('FATAL: JWT_SECRET is not set. Add it in your hosting environment variables.'); process.exit(1); }
  process.env.JWT_SECRET = 'dev-secret-change-me'; console.warn('JWT_SECRET not set. Using an insecure development secret (local use only).');
} else if (isProd && (process.env.JWT_SECRET.length < 16 || /change_this/i.test(process.env.JWT_SECRET))) {
  console.error('FATAL: JWT_SECRET is too short or is still the placeholder. Use a long random value (32+ characters).'); process.exit(1);
}

const { connect, state, explain } = require('./config/db');
const seed = require('./utils/seed');
const { corsOptions, rateLimit } = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
app.set('trust proxy', 1);                       // Render sits behind a proxy: needed for correct client IPs
app.use(cors(corsOptions()));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  const ok = state.status === 'ready';
  res.status(ok ? 200 : 503).json({ ok, service: 'coalguard-api', database: { status: state.status, mode: state.mode, ...(ok ? {} : { problem: state.hint }) }, time: new Date().toISOString() });
});

// While the database is not connected, say so clearly instead of pretending to work.
app.use('/api', (req, res, next) => state.status === 'ready' ? next() : res.status(503).json({ message: 'The database is not connected. ' + (state.hint || 'Please try again in a moment.') }));
app.use('/api/auth/login', rateLimit(20, 15 * 60 * 1000, 'Too many login attempts. Please wait 15 minutes and try again.'));
app.use('/api/auth/register', rateLimit(20, 60 * 60 * 1000, 'Too many registrations from this network. Please try again later.'));
app.use('/api/public/contact', rateLimit(8, 60 * 60 * 1000, 'Too many messages. Please try again later.'));
app.use('/api', require('./routes/api'));

const dist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html'))); }
else app.get('/', (req, res) => res.json({ service: 'CoalGuard API', health: '/api/health' }));
app.use(notFound);
app.use(errorHandler);

// --- start listening first, then connect (so the host sees the port and /api/health explains problems) ---
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Backend listening on port ${port}`));

(async function initDb() {
  for (;;) {
    try {
      await connect();
      if (process.env.SEED_DEMO_DATA !== 'false') await seed();
      state.status = 'ready';
      return;
    } catch (e) {
      state.status = 'error'; state.hint = e.config ? e.message : explain(e);
      console.error('Database setup failed: ' + state.hint);
      if (e.config) return;                       // missing setting: retrying cannot help
      await new Promise(r => setTimeout(r, 10000)); // network/auth problem: retry every 10 s
    }
  }
})();
