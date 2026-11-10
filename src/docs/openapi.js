const idParam = {
  name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 }, example: 1,
};
const pageParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
];
const logFilters = [
  { name: 'from', in: 'query', schema: { type: 'string', format: 'date' }, example: '2026-11-01' },
  { name: 'to', in: 'query', schema: { type: 'string', format: 'date' }, example: '2026-11-30' },
  ...pageParams,
];

const err = (description) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});
const json = (schema) => ({ 'application/json': { schema } });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const paginated = (item) => ({
  type: 'object',
  properties: { data: { type: 'array', items: ref(item) }, meta: ref('Pagination') },
});

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'API de Hábitos',
    version: '1.0.0',
    description: 'API REST para cadastrar hábitos, registrar progresso diário e consultar estatísticas.',
  },
  servers: [{ url: 'http://localhost:3000' }],
  tags: [
    { name: 'Hábitos' }, { name: 'Registros' }, { name: 'Estatísticas' }, { name: 'Sistema' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'], summary: 'Verifica se a API está no ar',
        responses: { 200: { description: 'OK', content: json({ type: 'object', properties: { status: { type: 'string', example: 'ok' }, uptime: { type: 'number' } } }) } },
      },
    },
    '/habits': {
      post: {
        tags: ['Hábitos'], summary: 'Cria um hábito',
        requestBody: { required: true, content: json(ref('HabitInput')) },
        responses: { 201: { description: 'Criado', content: json(ref('Habit')) }, 400: err('Dados inválidos') },
      },
      get: {
        tags: ['Hábitos'], summary: 'Lista hábitos (paginado)',
        parameters: [{ name: 'active', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } }, ...pageParams],
        responses: { 200: { description: 'Lista de hábitos', content: json(paginated('Habit')) }, 400: err('Parâmetros inválidos') },
      },
    },
    '/habits/{id}': {
      get: {
        tags: ['Hábitos'], summary: 'Busca um hábito pelo id', parameters: [idParam],
        responses: { 200: { description: 'Hábito', content: json(ref('Habit')) }, 400: err('Id inválido'), 404: err('Não encontrado') },
      },
      put: {
        tags: ['Hábitos'], summary: 'Atualiza um hábito (campos parciais)', parameters: [idParam],
        requestBody: { required: true, content: json(ref('HabitInput')) },
        responses: { 200: { description: 'Atualizado', content: json(ref('Habit')) }, 400: err('Dados inválidos'), 404: err('Não encontrado') },
      },
      delete: {
        tags: ['Hábitos'], summary: 'Exclui um hábito e todos os seus registros', parameters: [idParam],
        responses: { 204: { description: 'Excluído' }, 404: err('Não encontrado') },
      },
    },
    '/habits/{id}/check': {
      post: {
        tags: ['Registros'], summary: 'Marca o hábito como concluído em uma data (padrão: hoje)', parameters: [idParam],
        requestBody: { content: json(ref('CheckInput')) },
        responses: {
          201: { description: 'Registro criado', content: json(ref('Log')) },
          400: err('Dados inválidos'), 404: err('Hábito não encontrado'),
          409: err('Já existe registro para este hábito nesta data'),
        },
      },
    },
    '/habits/{id}/check/{date}': {
      delete: {
        tags: ['Registros'], summary: 'Desmarca o hábito em uma data',
        parameters: [idParam, { name: 'date', in: 'path', required: true, schema: { type: 'string', format: 'date' }, example: '2026-11-09' }],
        responses: { 204: { description: 'Registro removido' }, 400: err('Data inválida'), 404: err('Hábito ou registro não encontrado') },
      },
    },
    '/habits/{id}/logs': {
      get: {
        tags: ['Registros'], summary: 'Lista os registros de um hábito', parameters: [idParam, ...logFilters],
        responses: { 200: { description: 'Registros', content: json(paginated('Log')) }, 400: err('Parâmetros inválidos'), 404: err('Hábito não encontrado') },
      },
    },
    '/habits/{id}/stats': {
      get: {
        tags: ['Estatísticas'], summary: 'Estatísticas do hábito', parameters: [idParam],
        responses: { 200: { description: 'Estatísticas', content: json(ref('Stats')) }, 404: err('Hábito não encontrado') },
      },
    },
    '/logs': {
      get: {
        tags: ['Registros'], summary: 'Lista registros de todos os hábitos com filtros',
        parameters: [{ name: 'habit_id', in: 'query', schema: { type: 'integer' } }, ...logFilters],
        responses: { 200: { description: 'Registros', content: json(paginated('Log')) }, 400: err('Parâmetros inválidos') },
      },
    },
  },
  components: {
    schemas: {
      HabitInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 3, maxLength: 100, example: 'Beber 2L de água' },
          description: { type: 'string', nullable: true, maxLength: 500, example: 'Manter-se hidratado' },
          frequency: { type: 'string', enum: ['daily', 'weekly'], default: 'daily' },
          active: { type: 'boolean', default: true },
        },
      },
      Habit: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Beber 2L de água' },
          description: { type: 'string', nullable: true, example: 'Manter-se hidratado' },
          frequency: { type: 'string', enum: ['daily', 'weekly'], example: 'daily' },
          active: { type: 'boolean', example: true },
          created_at: { type: 'string', example: '2026-11-09 12:00:00' },
        },
      },
      CheckInput: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date', example: '2026-11-09', description: 'Padrão: hoje. Não pode ser futura.' },
          note: { type: 'string', nullable: true, example: 'Bebi 3 garrafas' },
        },
      },
      Log: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 10 },
          habit_id: { type: 'integer', example: 1 },
          date: { type: 'string', format: 'date', example: '2026-11-09' },
          completed: { type: 'boolean', example: true },
          note: { type: 'string', nullable: true },
        },
      },
      Stats: {
        type: 'object',
        properties: {
          habit_id: { type: 'integer', example: 1 },
          frequency: { type: 'string', example: 'daily' },
          total_completions: { type: 'integer', example: 12 },
          current_streak: { type: 'integer', example: 4, description: 'Em dias (daily) ou semanas (weekly)' },
          longest_streak: { type: 'integer', example: 7 },
          completion_rate_30d: { type: 'number', example: 0.4, description: 'Entre 0 e 1' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' }, limit: { type: 'integer' },
          total: { type: 'integer' }, totalPages: { type: 'integer' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Dados inválidos' },
              details: { nullable: true, example: [{ field: 'name', message: 'Too small' }] },
            },
          },
        },
      },
    },
  },
};
