const { Router } = require('express');
const { validate, schemas: s } = require('../middlewares/validate');
const habit = require('../controllers/habitController');
const log = require('../controllers/logController');

const router = Router();
const params = validate(s.idParams, 'params');

router.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

router.post('/habits', validate(s.habitCreate), habit.create);
router.get('/habits', validate(s.habitsQuery, 'query'), habit.list);
router.get('/habits/:id', params, habit.get);
router.put('/habits/:id', params, validate(s.habitUpdate), habit.update);
router.delete('/habits/:id', params, habit.remove);

router.post('/habits/:id/check', params, validate(s.checkBody), habit.check);
router.delete('/habits/:id/check/:date', validate(s.uncheckParams, 'params'), habit.uncheck);
router.get('/habits/:id/logs', params, validate(s.logsQuery, 'query'), habit.habitLogs);
router.get('/habits/:id/stats', params, habit.stats);

router.get('/logs', validate(s.logsQuery, 'query'), log.list);

module.exports = router;
