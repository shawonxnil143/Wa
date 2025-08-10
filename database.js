// database.js
const mongoose = require('mongoose');
const CONFIG = require('./config.json');
const logger = require('./logger'); // যদি আলাদা logger থাকে

async function connectDB() {
    if (!CONFIG.database?.enabled) {
        logger.info('📦 Database disabled in config.json');
        return;
    }

    const uri = CONFIG.database?.mongoURI;
    if (!uri) {
        logger.error('❌ MongoDB URI not found in config.json');
        return;
    }

    try {
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        logger.info('✅ MongoDB connected successfully');
    } catch (err) {
        logger.error(`❌ MongoDB connection failed: ${err.message}`);
    }
}

module.exports = { connectDB };
