const { AppError } = require('../utils/errors');

function notFoundHandler(req, _res, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `Rota ${req.method} ${req.originalUrl} não encontrada`));
}

/** Traduz erros do body-parser (JSON inválido, corpo grande) em erros 4xx. */
function fromParserError(err) {
  if (err.type === 'entity.parse.failed') {
    return new AppError(400, 'INVALID_JSON', 'Corpo da requisição não é um JSON válido');
  }
  if (err.type === 'entity.too.large') {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Corpo da requisição excede o limite permitido');
  }
  return err;
}

function errorHandler(err, _req, res, _next) {
  err = fromParserError(err);
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details ?? null },
    });
  }
  console.error(err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor', details: null },
  });
}

module.exports = { notFoundHandler, errorHandler };
