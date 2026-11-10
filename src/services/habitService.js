const { getDb } = require('../db/connection');
const { notFound } = require('../utils/errors');

const toHabit = (row) => row && { ...row, active: Boolean(row.active) };

function paginate(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

function list({ active, page, limit }) {
  const db = getDb();
  const where = active === undefined ? '' : 'WHERE active = ?';
  const params = active === undefined ? [] : [active === 'true' ? 1 : 0];
  const total = db.prepare(`SELECT COUNT(*) AS n FROM habits ${where}`).get(...params).n;
  const rows = db
    .prepare(`SELECT * FROM habits ${where} ORDER BY id LIMIT ? OFFSET ?`)
    .all(...params, limit, (page - 1) * limit);
  return { data: rows.map(toHabit), meta: paginate(page, limit, total) };
}

function getById(id) {
  const habit = toHabit(getDb().prepare('SELECT * FROM habits WHERE id = ?').get(id));
  if (!habit) throw notFound(`Hábito ${id} não encontrado`);
  return habit;
}

function create({ name, description, frequency, active }) {
  const { lastInsertRowid } = getDb()
    .prepare('INSERT INTO habits (name, description, frequency, active) VALUES (?, ?, ?, ?)')
    .run(name, description ?? null, frequency, active ? 1 : 0);
  return getById(Number(lastInsertRowid));
}

function update(id, changes) {
  const next = { ...getById(id), ...changes };
  getDb()
    .prepare('UPDATE habits SET name = ?, description = ?, frequency = ?, active = ? WHERE id = ?')
    .run(next.name, next.description ?? null, next.frequency, next.active ? 1 : 0, id);
  return getById(id);
}

function remove(id) {
  const { changes } = getDb().prepare('DELETE FROM habits WHERE id = ?').run(id);
  if (!changes) throw notFound(`Hábito ${id} não encontrado`);
}

module.exports = { list, getById, create, update, remove, paginate };
