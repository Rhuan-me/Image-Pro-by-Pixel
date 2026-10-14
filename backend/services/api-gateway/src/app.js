const express = require('express');
const helmet = require('helmet');
const corsMiddleware = require('./middlewares/cors');
const requestContext = require('./middlewares/requestContext');
const logger = require('./middlewares/logger');
const { authMiddleware } = require('./middlewares/auth');
const { generalLimiter } = require('./middlewares/rateLimit');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errors');
const { env } = require('./config/env');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(requestContext);
app.use(logger);
app.use(corsMiddleware);
app.use(generalLimiter);
// Evita consumir/recriar o body antes do proxy; os microsserviços fazem o parsing.
app.use(authMiddleware);
app.use(routes);
app.use(notFound);
app.use(errorHandler);
module.exports = app;
