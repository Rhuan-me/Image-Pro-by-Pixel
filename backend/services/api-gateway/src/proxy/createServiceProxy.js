// Polyfill para dependências upstream (http-proxy) que ainda chamam util._extend no Node >= 22/24
const util = require('util');
if (typeof util._extend === 'function') {
  util._extend = Object.assign;
}

const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const { buildErrorResponse } = require('../middlewares/errorHandler');
const config = require('../config/environment');

/**
 * Cria uma instância configurada de proxy reverso para um microsserviço de downstream.
 *
 * @param {Object} options
 * @param {string} options.serviceName Nome descritivo do microsserviço (ex: 'Auth Service')
 * @param {string} options.targetUrl URL base do serviço alvo (ex: 'http://localhost:3001')
 * @param {Object} [options.pathRewrite] Mapeamento opcional de reescrita de caminhos
 * @param {number} [options.timeout] Timeout em milissegundos
 * @returns {Function} Middleware Express de proxy
 */
function createServiceProxy({ serviceName, targetUrl, pathRewrite, timeout }) {
  const proxyTimeout = timeout || config.proxy.timeout;

  const handleProxyError = (err, req, res) => {
    // Se a resposta já foi enviada ou os headers foram despachados, encerra a conexão sem duplicar payload
    if (res.headersSent) {
      return;
    }

    const isTimeout = err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT';
    const isConnRefused = err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'EHOSTUNREACH';

    const status = isTimeout ? 504 : isConnRefused ? 503 : 502;
    const code = isTimeout
      ? 'GATEWAY_TIMEOUT'
      : isConnRefused
        ? 'SERVICE_UNAVAILABLE'
        : 'BAD_GATEWAY';

    const message = isTimeout
      ? `O serviço '${serviceName}' não respondeu dentro do tempo limite de ${proxyTimeout}ms.`
      : isConnRefused
        ? `O serviço '${serviceName}' está temporariamente indisponível. Por favor, tente novamente mais tarde.`
        : `Falha na comunicação entre o API Gateway e o serviço '${serviceName}'.`;

    const payload = buildErrorResponse({
      code,
      message,
      status,
      path: req.originalUrl,
      correlationId: req.correlationId,
      details: !config.isProduction ? { originalError: err.message, targetUrl } : undefined,
    });

    res.status(status).json(payload);
  };

  const handleProxyReq = (proxyReq, req, res) => {
    // Propaga o correlation ID para o microsserviço downstream
    if (req.correlationId) {
      proxyReq.setHeader('X-Correlation-Id', req.correlationId);
    }

    // Se o body já tiver sido processado pelo express.json(), retransmite corretamente o buffer
    if (req.body && Object.keys(req.body).length > 0) {
      fixRequestBody(proxyReq, req);
    }
  };

  const defaultPathRewrite = (path, req) => req.originalUrl || path;

  const proxyOptions = {
    target: targetUrl,
    changeOrigin: true,
    xfwd: true,
    timeout: proxyTimeout,
    proxyTimeout: proxyTimeout,
    pathRewrite: pathRewrite || defaultPathRewrite,
    // Compatibilidade com http-proxy-middleware v3
    on: {
      proxyReq: handleProxyReq,
      error: handleProxyError,
    },
    // Compatibilidade defensiva com http-proxy-middleware v2
    onProxyReq: handleProxyReq,
    onError: handleProxyError,
  };

  return createProxyMiddleware(proxyOptions);
}

module.exports = createServiceProxy;
