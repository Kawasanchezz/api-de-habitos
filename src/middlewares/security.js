const { rateLimit } = require('express-rate-limit');

/** Cabeçalhos de segurança. O Swagger UI (/docs) precisa de scripts/estilos inline, então fica sem CSP. */
function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  if (!req.path.startsWith('/docs')) {
    res.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  }
  next();
}

/** Limita requisições por IP para reduzir abuso e esgotamento de recursos. */
function createRateLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Muitas requisições; tente novamente em instantes', details: null },
      });
    },
  });
}

module.exports = { securityHeaders, createRateLimiter };
