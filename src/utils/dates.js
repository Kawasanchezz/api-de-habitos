const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;

/** Retorna true se a string é uma data real no formato YYYY-MM-DD. */
function isValidDate(str) {
  if (!DATE_RE.test(str)) return false;
  const d = new Date(`${str}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

/** Data de hoje (fuso local) em YYYY-MM-DD. */
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Número do dia desde a época (UTC), usado para comparar dias consecutivos. */
function dayNumber(str) {
  return Math.floor(new Date(`${str}T00:00:00Z`).getTime() / DAY_MS);
}

/** Número da semana (segunda a domingo) desde a época. */
function weekNumber(str) {
  // 1970-01-01 foi quinta-feira; +3 alinha a contagem para começar na segunda.
  return Math.floor((dayNumber(str) + 3) / 7);
}

function addDays(str, n) {
  return new Date((dayNumber(str) + n) * DAY_MS).toISOString().slice(0, 10);
}

module.exports = { isValidDate, today, dayNumber, weekNumber, addDays };
