function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let status = error.status || 500;
  let code = error.code || 'INTERNAL_SERVER_ERROR';
  let message = error.message;

  if (error.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'O corpo da requisição excede o limite permitido.';
  }

  if (status >= 500) {
    console.error({
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      error: error.message,
      stack: process.env.NODE_ENV === 'development'
        ? error.stack
        : undefined
    });

    message = 'Ocorreu um erro interno no servidor.';
  }

  return res.status(status).json({
    error: {
      code,
      message
    },
    ...(req.correlationId && {
      correlationId: req.correlationId
    })
  });
}

module.exports = { errorHandler };