const { createProxyMiddleware } = require('http-proxy-middleware');
const { env } = require('../config/env');

function createProxy(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: env.proxyTimeoutMs,
    timeout: env.proxyTimeoutMs,
    pathRewrite: (_path, req) => req.originalUrl,
    on: {
      proxyReq(proxyReq, req) {
        if (req.correlationId) proxyReq.setHeader('x-correlation-id', req.correlationId);

        // injeta o userId para uso de outro microservice
        if (req.auth && req.auth.userId) {
          proxyReq.setHeader('x-user-id', req.auth.userId);
        }
      },
      error(err, req, res) {
        if (res.headersSent) return;
        const timeout = err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT';
        const status = timeout ? 504 : 503;
        res.writeHead(status, { 'Content-Type': 'application/json', 'X-Correlation-Id': req.correlationId || '' });
        res.end(JSON.stringify({ error: { code: timeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE', message: timeout ? 'O serviço demorou para responder.' : 'Serviço temporariamente indisponível.', correlationId: req.correlationId } }));
      }
    }
  });
}
module.exports = { createProxy };
