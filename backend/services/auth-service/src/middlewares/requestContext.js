const { randomUUID } = require('node:crypto');

module.exports = function requestContext(req, res, next) {
  const supplied = req.get('x-correlation-id');

  const valid = supplied &&
    supplied.length <= 100 &&
    /^[A-Za-z0-9._:-]+$/.test(supplied);

  req.correlationId = valid ? supplied : randomUUID();

  res.setHeader('X-Correlation-Id', req.correlationId);

  next();
};