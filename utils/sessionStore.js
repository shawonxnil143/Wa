// Session store (no Mongo) — keep local auth only
async function backupAuthToDB(){ return false; }
async function restoreAuthFromDB(){ return false; }
module.exports = { backupAuthToDB, restoreAuthFromDB };
