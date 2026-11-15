const cors = require('cors');
const { env } = require('../config/env');

module.exports = cors({
  origin(origin, callback) {
    // Requisições sem Origin incluem chamadas server-to-server/health checks.
    if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origem não permitida pelo CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
  exposedHeaders: ['X-Correlation-Id'],
  credentials: true,
  maxAge: 600
});
