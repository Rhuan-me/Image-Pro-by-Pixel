const { v4: uuidv4 } = require('uuid');

function requestLogger(req, res, next) {
  req.correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Correlation-Id', req.correlationId);

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms) [CID: ${req.correlationId}]`);
  });

  next();
}

module.exports = { requestLogger };
