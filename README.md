# API de Hábitos

API REST simples para cadastrar hábitos, registrar progresso diário e consultar estatísticas (total, sequências e taxa de conclusão).

**Stack:** Node.js · Express · SQLite (`better-sqlite3`) · Zod · Swagger (OpenAPI 3) · Jest + Supertest

## Como rodar

```bash
npm install
cp .env.example .env     # opcional; há valores padrão
npm run dev              # desenvolvimento (nodemon)
# ou: npm start
```

- API: http://localhost:3000
- Documentação Swagger: http://localhost:3000/docs (JSON em `/docs.json`)
- Dados de exemplo: `npm run seed` (apaga e recria hábitos/registros de exemplo)
- Testes: `npm test`

As tabelas são criadas automaticamente na inicialização.

## Variáveis de ambiente

| Variável  | Padrão              | Descrição                                      |
|-----------|---------------------|------------------------------------------------|
| `PORT`    | `3000`              | Porta HTTP                                     |
| `HOST`    | `127.0.0.1`         | Interface de rede (`0.0.0.0` expõe na rede)    |
| `DB_PATH` | `./data/habits.db`  | Arquivo SQLite (`:memory:` para banco em memória) |
| `RATE_LIMIT_MAX` | `300`        | Máximo de requisições por IP por minuto        |

## Rotas

| Método | Rota                          | Descrição                                   | Sucesso |
|--------|-------------------------------|---------------------------------------------|---------|
| GET    | `/health`                     | Status da API                               | 200 |
| POST   | `/habits`                     | Cria hábito                                 | 201 |
| GET    | `/habits`                     | Lista hábitos (`?active=`, `?page=&limit=`) | 200 |
| GET    | `/habits/:id`                 | Busca hábito                                | 200 |
| PUT    | `/habits/:id`                 | Atualiza hábito (campos parciais)           | 200 |
| DELETE | `/habits/:id`                 | Exclui hábito e seus registros              | 204 |
| POST   | `/habits/:id/check`           | Marca progresso (`date` e `note` opcionais) | 201 |
| DELETE | `/habits/:id/check/:date`     | Desmarca o dia                              | 204 |
| GET    | `/habits/:id/logs`            | Registros do hábito (`from`, `to`, paginação) | 200 |
| GET    | `/logs`                       | Todos os registros (`habit_id`, `from`, `to`, paginação) | 200 |
| GET    | `/habits/:id/stats`           | Estatísticas do hábito                      | 200 |

Erros seguem o formato `{ "error": { "code", "message", "details" } }` com status 400, 404, 409 ou 500.

### Regras

- `name`: 3 a 100 caracteres. `frequency`: `daily` (padrão) ou `weekly`.
- Um registro por hábito por dia; repetir retorna **409**. A `date` padrão é hoje e não pode ser futura.
- Estatísticas: a sequência (streak) conta dias consecutivos (`daily`) ou semanas consecutivas (`weekly`). A sequência atual continua válida se o último registro foi no período atual ou no anterior. A taxa de 30 dias é dias concluídos ÷ 30 (ou semanas com conclusão ÷ 5, nos semanais).

## Exemplos com curl

```bash
# criar hábito
curl -X POST localhost:3000/habits -H "Content-Type: application/json" \
  -d '{"name":"Ler 20 minutos","frequency":"daily"}'

# marcar hoje
curl -X POST localhost:3000/habits/1/check -H "Content-Type: application/json" \
  -d '{"note":"Capítulo 3"}'

# marcar em outra data
curl -X POST localhost:3000/habits/1/check -H "Content-Type: application/json" \
  -d '{"date":"2026-11-01"}'

# desmarcar
curl -X DELETE localhost:3000/habits/1/check/2026-11-01

# registros filtrados e paginados
curl "localhost:3000/logs?habit_id=1&from=2026-11-01&to=2026-11-30&page=1&limit=10"

# estatísticas
curl localhost:3000/habits/1/stats
```

## Postman

Importe [postman_collection.json](postman_collection.json). A variável `baseUrl` aponta para `http://localhost:3000` e `habitId` define o hábito usado nas requisições.

## Segurança

Veja [SECURITY.md](SECURITY.md) para controles, limitações (a API **não tem autenticação**) e como reportar vulnerabilidades.

## Estrutura

```
src/
  app.js            # Express (sem listen, facilita testes)
  server.js         # inicia o servidor
  config.js
  routes/ controllers/ services/
  db/               # conexão, migração e seed
  middlewares/      # validação (zod) e tratamento de erros
  docs/openapi.js   # especificação OpenAPI
tests/api.test.js
```

## Esquema do banco

- `habits(id, name, description, frequency, active, created_at)`
- `habit_logs(id, habit_id → habits.id ON DELETE CASCADE, date, completed, note, UNIQUE(habit_id, date))`
