const express = require('express');
const helmet = require('helmet');
const corsMiddleware = require('./middlewares/cors');
const requestContext = require('./middlewares/requestContext');
const { generalLimiter } = require('./middlewares/rateLimit');
const routes = require('./routes/index');
const { notFound, errorHandler } = require('./middlewares/errors');

const app = express();
app.disable('x-powered-by');

// Middlewares globais de segurança, contexto e rate limit
app.use(helmet());
app.use(requestContext);
app.use(corsMiddleware);
app.use(generalLimiter);
app.use(express.json());

// Rotas do microsserviço
app.use(routes);

// Tratamento de erros e rotas não encontradas
app.use(notFound);
app.use(errorHandler);

module.exports = app;