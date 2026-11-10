process.env.DB_PATH = ':memory:';

const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const express = require('express');
const app = require('../src/app');
const { getDb } = require('../src/db/connection');
const { computeStreaks } = require('../src/services/statsService');
const { createRateLimiter } = require('../src/middlewares/security');
const { today, addDays } = require('../src/utils/dates');

// Verifica que `actual` contém ao menos os campos de `expected`.
const matches = (actual, expected) => assert.partialDeepStrictEqual(actual, expected);

beforeEach(() => {
  getDb().exec('DELETE FROM habit_logs; DELETE FROM habits;');
});

const createHabit = (body = { name: 'Meditar' }) => request(app).post('/habits').send(body);

describe('hábitos', () => {
  test('cria um hábito com valores padrão', async () => {
    const res = await createHabit();
    assert.equal(res.status, 201);
    matches(res.body, { name: 'Meditar', frequency: 'daily', active: true });
    assert.ok(res.body.id);
  });

  test('valida o corpo (nome curto, frequência inválida)', async () => {
    const res = await createHabit({ name: 'ab', frequency: 'monthly' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field);
    assert.ok(fields.includes('name') && fields.includes('frequency'));
  });

  test('lista, busca, atualiza e exclui', async () => {
    const { body: habit } = await createHabit();
    assert.equal((await request(app).get('/habits')).body.meta.total, 1);
    assert.equal((await request(app).get(`/habits/${habit.id}`)).status, 200);

    const upd = await request(app).put(`/habits/${habit.id}`).send({ active: false });
    matches(upd.body, { name: 'Meditar', active: false });

    assert.equal((await request(app).delete(`/habits/${habit.id}`)).status, 204);
    assert.equal((await request(app).get(`/habits/${habit.id}`)).status, 404);
  });

  test('id inválido retorna 400 e rota inexistente 404 em JSON', async () => {
    assert.equal((await request(app).get('/habits/abc')).status, 400);
    const res = await request(app).get('/nada');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'ROUTE_NOT_FOUND');
  });
});

describe('registros', () => {
  test('marca hoje por padrão e rejeita duplicata com 409', async () => {
    const { body: habit } = await createHabit();
    const first = await request(app).post(`/habits/${habit.id}/check`).send({ note: 'ok' });
    assert.equal(first.status, 201);
    matches(first.body, { date: today(), completed: true, note: 'ok' });

    const dup = await request(app).post(`/habits/${habit.id}/check`).send({});
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.code, 'CONFLICT');
  });

  test('rejeita data futura e hábito inexistente', async () => {
    const { body: habit } = await createHabit();
    const future = await request(app)
      .post(`/habits/${habit.id}/check`)
      .send({ date: addDays(today(), 3) });
    assert.equal(future.status, 400);
    assert.equal((await request(app).post('/habits/999/check').send({})).status, 404);
  });

  test('desmarca um dia', async () => {
    const { body: habit } = await createHabit();
    await request(app).post(`/habits/${habit.id}/check`).send({});
    assert.equal((await request(app).delete(`/habits/${habit.id}/check/${today()}`)).status, 204);
    assert.equal((await request(app).delete(`/habits/${habit.id}/check/${today()}`)).status, 404);
  });

  test('filtra por habit_id e intervalo de datas com paginação', async () => {
    const { body: a } = await createHabit({ name: 'Hábito A' });
    const { body: b } = await createHabit({ name: 'Hábito B' });
    for (let i = 0; i < 5; i++) {
      await request(app).post(`/habits/${a.id}/check`).send({ date: addDays(today(), -i) });
    }
    await request(app).post(`/habits/${b.id}/check`).send({});

    const byHabit = await request(app).get(`/logs?habit_id=${a.id}&limit=2&page=2`);
    assert.equal(byHabit.body.data.length, 2);
    matches(byHabit.body.meta, { total: 5, totalPages: 3, page: 2 });

    const range = await request(app).get(`/habits/${a.id}/logs?from=${addDays(today(), -1)}`);
    assert.equal(range.body.meta.total, 2);

    assert.equal((await request(app).get('/logs?from=2026-12-01&to=2026-01-01')).status, 400);
  });

  test('excluir o hábito remove os registros em cascata', async () => {
    const { body: habit } = await createHabit();
    await request(app).post(`/habits/${habit.id}/check`).send({});
    await request(app).delete(`/habits/${habit.id}`);
    assert.equal(getDb().prepare('SELECT COUNT(*) AS n FROM habit_logs').get().n, 0);
  });
});

describe('estatísticas', () => {
  test('computeStreaks calcula sequência atual e maior', () => {
    assert.deepEqual(computeStreaks([], 10), { current: 0, longest: 0 });
    assert.deepEqual(computeStreaks([1, 2, 3, 7, 8], 8), { current: 2, longest: 3 });
    assert.deepEqual(computeStreaks([1, 2, 3, 7, 8], 9), { current: 2, longest: 3 }); // ainda vale (ontem)
    assert.deepEqual(computeStreaks([1, 2, 3, 7, 8], 10), { current: 0, longest: 3 }); // quebrou
  });

  test('GET /habits/:id/stats', async () => {
    const { body: habit } = await createHabit();
    // hoje, ontem, anteontem + um dia isolado 10 dias atrás
    for (const offset of [0, 1, 2, 10]) {
      await request(app).post(`/habits/${habit.id}/check`).send({ date: addDays(today(), -offset) });
    }
    const res = await request(app).get(`/habits/${habit.id}/stats`);
    assert.equal(res.status, 200);
    matches(res.body, {
      total_completions: 4,
      current_streak: 3,
      longest_streak: 3,
      completion_rate_30d: 0.1333,
    });
  });

  test('streak semanal conta semanas consecutivas, não dias', async () => {
    const { body: habit } = await createHabit({ name: 'Treino semanal', frequency: 'weekly' });
    for (const offset of [0, 7, 14, 28]) {
      await request(app).post(`/habits/${habit.id}/check`).send({ date: addDays(today(), -offset) });
    }
    const res = await request(app).get(`/habits/${habit.id}/stats`);
    matches(res.body, { total_completions: 4, current_streak: 3, longest_streak: 3 });
  });
});

describe('endurecimento de segurança', () => {
  test('ids não canônicos são rejeitados', async () => {
    const { body: habit } = await createHabit();
    for (const bad of ['1e0', '0x1', '1.0', '%201', '0', '-1', '99999999999999999999']) {
      assert.equal((await request(app).get(`/habits/${bad}`)).status, 400, bad);
    }
    assert.equal((await request(app).get(`/habits/${habit.id}`)).status, 200);
  });

  test('corpo acima do limite retorna 413 em JSON (não 500)', async () => {
    const res = await request(app).post('/habits').send({ name: 'abc', description: 'x'.repeat(20000) });
    assert.equal(res.status, 413);
    assert.equal(res.body.error.code, 'PAYLOAD_TOO_LARGE');
  });

  test('envia cabeçalhos de segurança e oculta X-Powered-By', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.headers['x-powered-by'], undefined);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.match(res.headers['content-security-policy'], /default-src 'none'/);
  });

  test('limitador de requisições responde 429', async () => {
    const mini = express();
    mini.use(createRateLimiter({ windowMs: 60000, max: 2 }));
    mini.get('/', (_req, res) => res.json({}));
    assert.equal((await request(mini).get('/')).status, 200);
    assert.equal((await request(mini).get('/')).status, 200);
    const blocked = await request(mini).get('/');
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.error.code, 'RATE_LIMITED');
  });
});

test('GET /health', async () => {
  assert.equal((await request(app).get('/health')).body.status, 'ok');
});
