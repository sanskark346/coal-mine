// Database connection. MongoDB Atlas is required in production.
// The local JSON file is allowed ONLY for local development when MONGODB_URI is empty.
const store = require('../models/store');

const state = { status: 'connecting', mode: null, hint: null }; // status: connecting | ready | error
const isProd = () => process.env.NODE_ENV === 'production';

// Turn raw driver errors into a message the person can act on (never includes the connection string).
function explain(e) {
  const m = String((e && e.message) || e);
  if (/bad auth|authentication failed/i.test(m)) return 'MongoDB rejected the username or password. Check the user and password inside MONGODB_URI (special characters in the password must be URL-encoded).';
  if (/ENOTFOUND|querySrv|EAI_AGAIN/i.test(m)) return 'The MongoDB host name could not be found. Check that MONGODB_URI is copied exactly from Atlas (Connect > Drivers).';
  if (/Server selection timed out|ECONNREFUSED|ETIMEDOUT|whitelist|not allowed/i.test(m)) return 'Could not reach MongoDB Atlas. In Atlas open Network Access and allow the IP address 0.0.0.0/0 (needed for Render), then wait a minute.';
  if (/Invalid scheme|Invalid connection string|must be a string/i.test(m)) return 'MONGODB_URI is not a valid MongoDB connection string. It must start with mongodb+srv:// or mongodb://';
  return 'Database error: ' + m.split('\n')[0].slice(0, 160);
}
exports.explain = explain;
exports.state = state;

exports.connect = async () => {
  const uri = (process.env.MONGODB_URI || '').trim();
  if (!uri) {
    if (isProd() || process.env.ALLOW_JSON_FALLBACK === 'false') {
      const err = new Error('MONGODB_URI is not set. Add your MongoDB Atlas connection string as the MONGODB_URI environment variable.');
      err.config = true; throw err;
    }
    store.init('json');
    Object.assign(state, { status: 'connecting', mode: 'json', hint: null });
    console.log('Database: local JSON file (development only, backend/data/db.json)');
    return;
  }
  const mongoose = require('mongoose');
  mongoose.set('strictQuery', false);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  store.init('mongo', mongoose);
  mongoose.connection.on('disconnected', () => { state.status = 'error'; state.hint = 'The connection to MongoDB was lost. Trying to reconnect...'; console.warn('MongoDB disconnected'); });
  mongoose.connection.on('connected', () => { if (state.mode === 'mongo') { state.status = 'ready'; state.hint = null; } });
  Object.assign(state, { status: 'connecting', mode: 'mongo', hint: null });
  console.log('Database: MongoDB connected');
};
