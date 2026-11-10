const { getDb } = require('../db/connection');
const { today, dayNumber, weekNumber, addDays } = require('../utils/dates');
const habits = require('./habitService');

/**
 * Calcula sequência atual e maior sequência a partir de períodos (dias ou semanas)
 * únicos e ordenados. A sequência atual só vale se o último período concluído
 * for o atual ou o imediatamente anterior (ainda dá tempo de mantê-la).
 */
function computeStreaks(periods, currentPeriod) {
  if (!periods.length) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < periods.length; i++) {
    run = periods[i] === periods[i - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const last = periods[periods.length - 1];
  const current = last >= currentPeriod - 1 ? run : 0;
  return { current, longest };
}

function getStats(habitId) {
  const habit = habits.getById(habitId);
  const dates = getDb()
    .prepare('SELECT date FROM habit_logs WHERE habit_id = ? AND completed = 1 ORDER BY date')
    .all(habitId)
    .map((r) => r.date);

  const toPeriod = habit.frequency === 'weekly' ? weekNumber : dayNumber;
  const periods = [...new Set(dates.map(toPeriod))];
  const { current, longest } = computeStreaks(periods, toPeriod(today()));

  // Taxa nos últimos 30 dias: dias concluídos / 30 (diário)
  // ou semanas com conclusão / 5 (semanal).
  const since = addDays(today(), -29);
  const done = new Set(dates.filter((d) => d >= since).map(toPeriod)).size;
  const expected = habit.frequency === 'weekly' ? 5 : 30;

  return {
    habit_id: habit.id,
    frequency: habit.frequency,
    total_completions: dates.length,
    current_streak: current,
    longest_streak: longest,
    completion_rate_30d: Math.min(1, Number((done / expected).toFixed(4))),
  };
}

module.exports = { getStats, computeStreaks };
