const logs = require('../services/logService');

module.exports = {
  list: (req, res) => res.json(logs.list(req.valid.query)),
};
