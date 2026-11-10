require('dotenv').config({ quiet: true });

module.exports = {
  port: Number(process.env.PORT) || 3000,
  // Por padrão só aceita conexões da própria máquina; use HOST=0.0.0.0 para expor na rede.
  host: process.env.HOST || '127.0.0.1',
  dbPath: process.env.DB_PATH || './data/habits.db',
  rateLimit: {
    windowMs: 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 300,
  },
};
