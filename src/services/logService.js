const { getDb } = require('../db/connection');
const { conflict, notFound } = require('../utils/errors');
const { today } = require('../utils/dates');
const habits = require('./habitService');

const toLog = (row) => row && { ...row, completed: Boolean(row.completed) };

function check(habitId, { date = today(), note } = {}) {
  habits.getById(habitId);
  try {
    const { lastInsertRowid } = getDb()
      .prepare('INSERT INTO habit_logs (habit_id, date, completed, note) VALUES (?, ?, 1, ?)')
      .run(habitId, date, note ?? null);
    return toLog(getDb().prepare('SELECT * FROM habit_logs WHERE id = ?').get(lastInsertRowid));
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw conflict(`O hábito ${habitId} já foi registrado em ${date}`);
    }
    throw err;
  }
}

function uncheck(habitId, date) {
  habits.getById(habitId);
  const { changes } = getDb()
    .prepare('DELETE FROM habit_logs WHERE habit_id = ? AND date = ?')
    .run(habitId, date);
  if (!changes) throw notFound(`Nenhum registro do hábito ${habitId} em ${date}`);
}

function list({ habit_id, from, to, page, limit }) {
  const conditions = [];
  const params = [];
  if (habit_id) { conditions.push('habit_id = ?'); params.push(habit_id); }
  if (from) { conditions.push('date >= ?'); params.push(from); }
  if (to) { conditions.push('date <= ?'); params.push(to); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) AS n FROM habit_logs ${where}`).get(...params).n;
  const rows = db
    .prepare(`SELECT * FROM habit_logs ${where} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, (page - 1) * limit);
  return { data: rows.map(toLog), meta: habits.paginate(page, limit, total) };
}

module.exports = { check, uncheck, list };
