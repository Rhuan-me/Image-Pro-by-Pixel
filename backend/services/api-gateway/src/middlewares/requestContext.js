const { randomUUID } = require('node:crypto');

module.exports = function requestContext(req, res, next) {
  const supplied = req.get('x-correlation-id');
  // Aceita IDs simples e limitados; nunca propaga strings arbitrárias do cliente.
  const valid = supplied && supplied.length <= 100 && /^[A-Za-z0-9._:-]+$/.test(supplied);
  req.correlationId = valid ? supplied : randomUUID();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
};
