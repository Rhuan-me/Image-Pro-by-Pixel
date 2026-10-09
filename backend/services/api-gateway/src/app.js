/**
 * @file app.js
 * @description Fábrica da aplicação Express do API Gateway.
 */

const express = require('express');
const helmet = require('helmet');
const corsMiddleware = require('./middlewares/cors');
const loggingMiddleware = require('./middlewares/logging');
const requestContextMiddleware = require('./middlewares/requestContext');
const routes = require('./routes');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/errorHandler');

function createApp() {
  const app = express();

  // 1. Headers de segurança HTTP
  app.use(helmet());

  // 2. Cross-Origin Resource Sharing (CORS)
  app.use(corsMiddleware);

  // 3. Contexto de rastreabilidade (Correlation ID)
  app.use(requestContextMiddleware);

  // 4. Logging de requisições HTTP
  app.use(loggingMiddleware);

  // 5. Parser leve de JSON apenas para endpoints locais do gateway (rotas de proxy usam streaming direto)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 6. Registro de rotas e proxies reversos
  app.use('/', routes);

  // 7. Rota não encontrada (404)
  app.use(notFoundHandler);

  // 8. Tratamento global de erros (500 / exceções não capturadas)
  app.use(globalErrorHandler);

  return app;
}

module.exports = createApp;
