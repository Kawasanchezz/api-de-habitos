const habits = require('../services/habitService');
const logs = require('../services/logService');
const stats = require('../services/statsService');

module.exports = {
  list: (req, res) => res.json(habits.list(req.valid.query)),
  get: (req, res) => res.json(habits.getById(req.valid.params.id)),
  create: (req, res) => res.status(201).json(habits.create(req.valid.body)),
  update: (req, res) => res.json(habits.update(req.valid.params.id, req.valid.body)),
  remove: (req, res) => {
    habits.remove(req.valid.params.id);
    res.status(204).end();
  },

  check: (req, res) => res.status(201).json(logs.check(req.valid.params.id, req.valid.body)),
  uncheck: (req, res) => {
    logs.uncheck(req.valid.params.id, req.valid.params.date);
    res.status(204).end();
  },
  habitLogs: (req, res) => {
    habits.getById(req.valid.params.id);
    res.json(logs.list({ ...req.valid.query, habit_id: req.valid.params.id }));
  },
  stats: (req, res) => res.json(stats.getStats(req.valid.params.id)),
};
