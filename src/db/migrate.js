function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL CHECK (length(name) BETWEEN 3 AND 100),
      description TEXT,
      frequency   TEXT    NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
      active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id   INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date       TEXT    NOT NULL,
      completed  INTEGER NOT NULL DEFAULT 1 CHECK (completed IN (0, 1)),
      note       TEXT,
      UNIQUE (habit_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_logs_date ON habit_logs(date);
  `);
}

module.exports = { migrate };
