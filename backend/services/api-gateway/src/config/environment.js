/**
 * @file environment.js
 * @description Módulo centralizado de configuração e variáveis de ambiente do API Gateway.
 */

const dotenv = require('dotenv');
const path = require('path');

// Carrega o arquivo .env se estiver presente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const environment = Object.freeze({
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-Id'],
    credentials: true,
  },

  logging: {
    format: process.env.LOG_FORMAT || (process.env.NODE_ENV === 'production' ? 'combined' : 'dev'),
  },

  proxy: {
    timeout: parseInt(process.env.PROXY_TIMEOUT || '30000', 10),
  },

  services: {
    auth: {
      name: 'Auth Service',
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    },
    project: {
      name: 'Project Service',
      url: process.env.PROJECT_SERVICE_URL || 'http://localhost:3002',
    },
    imageProcessing: {
      name: 'Image Processing Service',
      url: process.env.IMAGE_PROCESSING_SERVICE_URL || 'http://localhost:3003',
    },
  },
});

module.exports = environment;
