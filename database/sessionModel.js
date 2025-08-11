// Session schema
const mongoose = require('mongoose');
const sessionSchema = new mongoose.Schema({
  file: String,
  data: String
});
module.exports = mongoose.model('Session', sessionSchema);
