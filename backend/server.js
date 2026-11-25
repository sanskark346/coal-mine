require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
if (!process.env.JWT_SECRET) { process.env.JWT_SECRET = 'dev-secret-change-me'; console.warn('JWT_SECRET not set in .env. Using an insecure development secret.'); }
const { connect } = require('./config/db');
const seed = require('./utils/seed');
const { notFound, errorHandler } = require('./middleware/error');

(async () => {
  await connect();
  await seed();
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api', require('./routes/api'));
  const dist = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html'))); }
  app.use(notFound);
  app.use(errorHandler);
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Backend running at http://localhost:${port}`));
})().catch(e => { console.error('Failed to start:', e); process.exit(1); });
