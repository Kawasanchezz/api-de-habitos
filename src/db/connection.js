const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { dbPath } = require('../config');
const { migrate } = require('./migrate');

let db;

/** Abre (uma única vez) a conexão e garante que as tabelas existam. */
function getDb() {
  if (!db) {
    if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    migrate(db);
  }
  return db;
}

function closeDb() {
  if (db) db.close();
  db = undefined;
}

module.exports = { getDb, closeDb };
