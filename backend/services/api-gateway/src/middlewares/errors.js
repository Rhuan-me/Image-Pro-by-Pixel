class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

function notFound(req, res) {
  res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada.', correlationId: req.correlationId } });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status <= 599 ? err.status : 500;
  const safe = status < 500 && err instanceof HttpError;
  const message = safe ? err.message : (status === 503 ? 'Serviço temporariamente indisponível.' : 'Ocorreu um erro interno.');
  if (status >= 500) console.error(JSON.stringify({ level: 'error', correlationId: req.correlationId, status, error: err.message }));
  res.status(status).json({ error: { code: safe ? err.code : (status === 503 ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_ERROR'), message, correlationId: req.correlationId } });
}

module.exports = { HttpError, notFound, errorHandler };
