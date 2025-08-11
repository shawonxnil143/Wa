
// database.js — optional MongoDB connector
const mongoose = require('mongoose');
const CONFIG = require('./config.json');

async function connectDB(logger = console) {
  try {
    const enabled = !!(CONFIG.database && CONFIG.database.enabled);
    if (!enabled) {
      logger.info('📦 Database disabled in config.json');
      return { connected: false, reason: 'disabled' };
    }
    const uri = CONFIG.database.mongoURI || process.env.MONGO_URI;
    if (!uri) {
      logger.warn('⚠️ No MONGO URI provided (config.database.mongoURI or env MONGO_URI). Skipping DB.');
      return { connected: false, reason: 'no-uri' };
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    logger.info('✅ MongoDB connected');
    return { connected: true };
  } catch (err) {
    logger.error(`❌ MongoDB connection failed: ${err.message}`);
    return { connected: false, reason: 'error' };
  }
}

module.exports = { connectDB };
