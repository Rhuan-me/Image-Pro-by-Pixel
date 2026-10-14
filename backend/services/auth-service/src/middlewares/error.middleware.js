
function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';

  if (status >= 500) {
    console.error(error);
  }

  return res.status(status).json({
    error: {
      code,
      message: status >= 500
        ? 'Ocorreu um erro interno no servidor.'
        : error.message
    }
  });
}

module.exports = { errorHandler };
