const store = require('../models/store');
exports.connect = async () => {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      const mongoose = require('mongoose');
      mongoose.set('strictQuery', false);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
      store.init('mongo', mongoose);
      console.log('Database: MongoDB connected');
      return;
    } catch (e) {
      console.warn('MongoDB not reachable (' + e.message + '). Falling back to JSON file storage.');
    }
  }
  store.init('json');
  console.log('Database: local JSON file (backend/data/db.json)');
};
