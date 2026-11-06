function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Rota ${req.method} ${req.originalUrl} não encontrada no microsserviço.`
  });
}

function globalErrorHandler(err, req, res, next) {
  console.error('[ErrorHandler] Erro capturado:', err);

  let statusCode = err.status || err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      errorCode = 'FILE_TOO_LARGE';
    } else {
      statusCode = 400;
      errorCode = 'UPLOAD_ERROR';
    }
  } else if (err.message && err.message.includes('Formato de arquivo inválido')) {
    statusCode = 400;
    errorCode = 'INVALID_MIME_TYPE';
  }

  res.status(statusCode).json({
    success: false,
    error: errorCode,
    message: err.message || 'Ocorreu um erro interno no servidor.',
    correlationId: req?.correlationId
  });
}

module.exports = { notFoundHandler, globalErrorHandler };
