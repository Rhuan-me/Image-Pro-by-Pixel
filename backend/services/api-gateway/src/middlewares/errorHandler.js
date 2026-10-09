/**
 * @file errorHandler.js
 * @description Tratamento global de erros e padronização das respostas de falha do API Gateway.
 */

const config = require('../config/environment');

/**
 * Monta o payload padronizado de erro da API.
 *
 * @param {Object} params
 * @param {string} params.code Código semântico do erro (ex: 'SERVICE_UNAVAILABLE')
 * @param {string} params.message Mensagem clara para o consumidor da API
 * @param {number} params.status Status code HTTP
 * @param {string} params.path Caminho da requisição
 * @param {string} [params.correlationId] Identificador de correlação
 * @param {any} [params.details] Detalhes opcionais (em desenvolvimento)
 * @returns {Object} Estrutura JSON padronizada
 */
function buildErrorResponse({ code, message, status, path, correlationId, details }) {
  const response = {
    error: {
      code,
      message,
      status,
      timestamp: new Date().toISOString(),
      path,
      correlationId: correlationId || null,
    },
  };

  if (!config.isProduction && details) {
    response.error.details = details;
  }

  return response;
}

/**
 * Middleware para capturar rotas não mapeadas (404 Not Found).
 */
function notFoundHandler(req, res) {
  const status = 404;
  const payload = buildErrorResponse({
    code: 'ROUTE_NOT_FOUND',
    message: `A rota '${req.method} ${req.originalUrl}' não foi encontrada no API Gateway.`,
    status,
    path: req.originalUrl,
    correlationId: req.correlationId,
  });

  res.status(status).json(payload);
}

/**
 * Middleware global de captura de erros não tratados.
 */
function globalErrorHandler(err, req, res, next) {
  // Se a resposta já começou a ser enviada pelo proxy/socket, delega ao tratador padrão do Express
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const code = err.code || (status === 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
  const message = err.message || 'Ocorreu um erro interno ao processar a requisição no API Gateway.';

  const payload = buildErrorResponse({
    code,
    message,
    status,
    path: req.originalUrl,
    correlationId: req.correlationId,
    details: err.stack,
  });

  res.status(status).json(payload);
}

module.exports = {
  buildErrorResponse,
  notFoundHandler,
  globalErrorHandler,
};
