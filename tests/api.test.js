process.env.DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/app');
const { getDb } = require('../src/db/connection');
const { computeStreaks } = require('../src/services/statsService');
const { today, addDays } = require('../src/utils/dates');

beforeEach(() => {
  getDb().exec('DELETE FROM habit_logs; DELETE FROM habits;');
});

const createHabit = (body = { name: 'Meditar' }) => request(app).post('/habits').send(body);

describe('hábitos', () => {
  test('cria um hábito com valores padrão', async () => {
    const res = await createHabit();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Meditar', frequency: 'daily', active: true });
    expect(res.body.id).toBeDefined();
  });

  test('valida o corpo (nome curto, frequência inválida)', async () => {
    const res = await createHabit({ name: 'ab', frequency: 'monthly' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field)).toEqual(
      expect.arrayContaining(['name', 'frequency'])
    );
  });

  test('lista, busca, atualiza e exclui', async () => {
    const { body: habit } = await createHabit();
    expect((await request(app).get('/habits')).body.meta.total).toBe(1);
    expect((await request(app).get(`/habits/${habit.id}`)).status).toBe(200);

    const upd = await request(app).put(`/habits/${habit.id}`).send({ active: false });
    expect(upd.body).toMatchObject({ name: 'Meditar', active: false });

    expect((await request(app).delete(`/habits/${habit.id}`)).status).toBe(204);
    expect((await request(app).get(`/habits/${habit.id}`)).status).toBe(404);
  });

  test('id inválido retorna 400 e rota inexistente 404 em JSON', async () => {
    expect((await request(app).get('/habits/abc')).status).toBe(400);
    const res = await request(app).get('/nada');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});

describe('registros', () => {
  test('marca hoje por padrão e rejeita duplicata com 409', async () => {
    const { body: habit } = await createHabit();
    const first = await request(app).post(`/habits/${habit.id}/check`).send({ note: 'ok' });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ date: today(), completed: true, note: 'ok' });

    const dup = await request(app).post(`/habits/${habit.id}/check`).send({});
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('CONFLICT');
  });

  test('rejeita data futura e hábito inexistente', async () => {
    const { body: habit } = await createHabit();
    const future = await request(app)
      .post(`/habits/${habit.id}/check`)
      .send({ date: addDays(today(), 3) });
    expect(future.status).toBe(400);
    expect((await request(app).post('/habits/999/check').send({})).status).toBe(404);
  });

  test('desmarca um dia', async () => {
    const { body: habit } = await createHabit();
    await request(app).post(`/habits/${habit.id}/check`).send({});
    expect((await request(app).delete(`/habits/${habit.id}/check/${today()}`)).status).toBe(204);
    expect((await request(app).delete(`/habits/${habit.id}/check/${today()}`)).status).toBe(404);
  });

  test('filtra por habit_id e intervalo de datas com paginação', async () => {
    const { body: a } = await createHabit({ name: 'Hábito A' });
    const { body: b } = await createHabit({ name: 'Hábito B' });
    for (let i = 0; i < 5; i++) {
      await request(app).post(`/habits/${a.id}/check`).send({ date: addDays(today(), -i) });
    }
    await request(app).post(`/habits/${b.id}/check`).send({});

    const byHabit = await request(app).get(`/logs?habit_id=${a.id}&limit=2&page=2`);
    expect(byHabit.body.data).toHaveLength(2);
    expect(byHabit.body.meta).toMatchObject({ total: 5, totalPages: 3, page: 2 });

    const range = await request(app).get(`/habits/${a.id}/logs?from=${addDays(today(), -1)}`);
    expect(range.body.meta.total).toBe(2);

    expect((await request(app).get('/logs?from=2026-12-01&to=2026-01-01')).status).toBe(400);
  });

  test('excluir o hábito remove os registros em cascata', async () => {
    const { body: habit } = await createHabit();
    await request(app).post(`/habits/${habit.id}/check`).send({});
    await request(app).delete(`/habits/${habit.id}`);
    const count = getDb().prepare('SELECT COUNT(*) AS n FROM habit_logs').get().n;
    expect(count).toBe(0);
  });
});

describe('estatísticas', () => {
  test('computeStreaks calcula sequência atual e maior', () => {
    expect(computeStreaks([], 10)).toEqual({ current: 0, longest: 0 });
    expect(computeStreaks([1, 2, 3, 7, 8], 8)).toEqual({ current: 2, longest: 3 });
    expect(computeStreaks([1, 2, 3, 7, 8], 9)).toEqual({ current: 2, longest: 3 }); // ainda vale (ontem)
    expect(computeStreaks([1, 2, 3, 7, 8], 10)).toEqual({ current: 0, longest: 3 }); // quebrou
  });

  test('GET /habits/:id/stats', async () => {
    const { body: habit } = await createHabit();
    // hoje, ontem, anteontem + um dia isolado 10 dias atrás
    for (const offset of [0, 1, 2, 10]) {
      await request(app).post(`/habits/${habit.id}/check`).send({ date: addDays(today(), -offset) });
    }
    const res = await request(app).get(`/habits/${habit.id}/stats`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      total_completions: 4,
      current_streak: 3,
      longest_streak: 3,
      completion_rate_30d: 0.1333,
    });
  });
});

test('GET /health', async () => {
  expect((await request(app).get('/health')).body.status).toBe('ok');
});
