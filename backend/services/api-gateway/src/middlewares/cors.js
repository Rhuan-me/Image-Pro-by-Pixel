/**
 * @file cors.js
 * @description Middleware de configuração de Cross-Origin Resource Sharing (CORS).
 */

const cors = require('cors');
const config = require('../config/environment');

const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (como curl, mobile apps ou ferramentas de API)
    if (!origin || config.cors.origin === '*') {
      return callback(null, true);
    }

    const allowedOrigins = config.cors.origin.split(',').map((o) => o.trim());
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origem CORS '${origin}' não autorizada pelo API Gateway.`));
  },
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
  credentials: config.cors.credentials,
});

module.exports = corsMiddleware;
