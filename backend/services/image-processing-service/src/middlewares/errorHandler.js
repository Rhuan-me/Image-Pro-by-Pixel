function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Rota ${req.method} ${req.originalUrl} não encontrada no microsserviço.`
  });
}

function globalErrorHandler(err, req, res, next) {
  console.error('[ErrorHandler] Erro capturado:', err);

  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  res.status(statusCode).json({
    success: false,
    error: errorCode,
    message: err.message || 'Ocorreu um erro interno no servidor.',
    correlationId: req?.correlationId
  });
}

module.exports = { notFoundHandler, globalErrorHandler };
