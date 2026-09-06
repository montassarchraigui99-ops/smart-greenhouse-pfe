const db = require('better-sqlite3')('greenhouse.db');
const tableInfo = db.prepare("PRAGMA table_info('user_profiles')").all();
console.log("SCHEMA:", tableInfo);
const profiles = db.prepare("SELECT * FROM user_profiles").all();
console.log("DATA:", profiles);
