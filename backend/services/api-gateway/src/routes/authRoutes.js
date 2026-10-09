/**
 * @file authRoutes.js
 * @description Proxy reverso transparente para o Auth Service (autenticação e identidade).
 * O Gateway NÃO possui regras de negócio de autenticação, delegando 100% da lógica ao microsserviço.
 */

const express = require('express');
const createServiceProxy = require('../proxy/createServiceProxy');
const config = require('../config/environment');

const router = express.Router();

const authProxy = createServiceProxy({
  serviceName: config.services.auth.name,
  targetUrl: config.services.auth.url,
});

// Encaminha todos os métodos HTTP (GET, POST, PUT, DELETE, OPTIONS, etc.)
router.use('/', authProxy);

module.exports = router;
