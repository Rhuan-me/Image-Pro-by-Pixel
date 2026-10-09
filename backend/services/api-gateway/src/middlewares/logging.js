/**
 * @file logging.js
 * @description Middleware para logging estruturado de requisições HTTP recebidas pelo Gateway.
 */

const morgan = require('morgan');
const config = require('../config/environment');

// Token personalizado para correlation ID se presente no header
morgan.token('correlation-id', (req) => req.headers['x-correlation-id'] || '-');

const loggingMiddleware = morgan(
  config.isProduction
    ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :correlation-id - :response-time ms'
    : ':method :url :status :response-time ms - correlationId=:correlation-id',
  {
    skip: () => config.isTest,
  }
);

module.exports = loggingMiddleware;
