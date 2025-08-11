// Session store (no Mongo) — keep local auth only
// These functions exist for compatibility; they do nothing.
async function backupAuthToDB(_authDir) {
  // no-op: we do not persist sessions to MongoDB
  return false;
}
async function restoreAuthFromDB(_authDir) {
  // no-op: always start from local auth files (if any)
  return false;
}
module.exports = { backupAuthToDB, restoreAuthFromDB };
