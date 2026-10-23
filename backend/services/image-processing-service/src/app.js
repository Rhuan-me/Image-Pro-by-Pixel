const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { requestLogger } = require('./middlewares/requestLogger');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/errorHandler');
const routes = require('./routes');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(requestLogger);

// Parsers para JSON e URL-Encoded (arquivos multipart são manipulados pelo Multer em rotas específicas)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Montagem das rotas
app.use(routes);

// Tratamento de erros e 404
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
