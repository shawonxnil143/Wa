// MongoDB connection utility
const mongoose = require('mongoose');
module.exports = async (uri) => {
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
  }
};
