// utils/database.js
const mongoose = require('mongoose');
const chalk = require('chalk');

async function connectDB(uri) {
  if (!uri) {
    console.log(chalk.yellow('⚠ MongoDB URI not provided.'));
    return;
  }
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log(chalk.green.bold('✅ MongoDB Connected'));
  } catch (err) {
    console.error(chalk.red.bold(`❌ MongoDB Connection Failed: ${err.message}`));
  }
}

module.exports = { connectDB };
