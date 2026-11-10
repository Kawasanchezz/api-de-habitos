const { getDb, closeDb } = require('./connection');
const { addDays, today } = require('../utils/dates');

if (process.env.NODE_ENV === 'production') {
  console.error('Seed recusado: ele apaga todos os dados e não roda com NODE_ENV=production.');
  process.exit(1);
}

const db = getDb();
db.exec('DELETE FROM habit_logs; DELETE FROM habits;');

const insertHabit = db.prepare(
  'INSERT INTO habits (name, description, frequency) VALUES (?, ?, ?)'
);
const insertLog = db.prepare(
  'INSERT INTO habit_logs (habit_id, date, completed, note) VALUES (?, ?, 1, ?)'
);

const habits = [
  { name: 'Beber 2L de água', description: 'Manter-se hidratado', frequency: 'daily', skip: [3, 9] },
  { name: 'Ler 20 minutos', description: 'Leitura antes de dormir', frequency: 'daily', skip: [1, 2, 6, 12] },
  { name: 'Treino na academia', description: 'Musculação', frequency: 'weekly', skip: [] },
];

db.transaction(() => {
  for (const h of habits) {
    const { lastInsertRowid: id } = insertHabit.run(h.name, h.description, h.frequency);
    const step = h.frequency === 'weekly' ? 7 : 1;
    for (let i = 0; i < 28; i += step) {
      if (h.skip.includes(i)) continue;
      insertLog.run(id, addDays(today(), -i), i === 0 ? 'Feito hoje!' : null);
    }
  }
})();

console.log(`Seed concluído: ${habits.length} hábitos criados.`);
closeDb();
