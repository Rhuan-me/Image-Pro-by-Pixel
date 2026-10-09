/**
 * @file requestContext.js
 * @description Middleware para injeção e propagação de Correlation ID para observabilidade distribuída.
 */

const { randomUUID } = require('crypto');

const requestContextMiddleware = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
};

module.exports = requestContextMiddleware;
