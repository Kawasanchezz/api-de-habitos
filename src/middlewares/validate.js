const { z } = require('zod');
const { badRequest } = require('../utils/errors');
const { isValidDate, today } = require('../utils/dates');

/** Valida req[source] com um schema zod e guarda o valor convertido em req.valid[source]. */
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return next(badRequest('Dados inválidos', details));
  }
  req.valid = { ...req.valid, [source]: result.data };
  next();
};

const dateString = z
  .string()
  .refine(isValidDate, 'Data inválida; use o formato YYYY-MM-DD');
const pastOrToday = dateString.refine((d) => d <= today(), 'A data não pode estar no futuro');

const id = z.coerce.number().int().positive();

const habitCreate = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(500).nullish(),
  frequency: z.enum(['daily', 'weekly']).default('daily'),
  active: z.boolean().default(true),
});

const habitUpdate = z
  .object({
    name: z.string().trim().min(3).max(100),
    description: z.string().trim().max(500).nullable(),
    frequency: z.enum(['daily', 'weekly']),
    active: z.boolean(),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

const idParams = z.object({ id });
const checkBody = z.object({
  date: pastOrToday.optional(),
  note: z.string().trim().max(500).nullish(),
});
const uncheckParams = z.object({ id, date: dateString });

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const logsQuery = z
  .object({
    habit_id: id.optional(),
    from: dateString.optional(),
    to: dateString.optional(),
    ...pagination,
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" não pode ser posterior a "to"',
    path: ['from'],
  });

const habitsQuery = z.object({
  active: z.enum(['true', 'false']).optional(),
  ...pagination,
});

module.exports = {
  validate,
  schemas: { habitCreate, habitUpdate, idParams, checkBody, uncheckParams, logsQuery, habitsQuery },
};
