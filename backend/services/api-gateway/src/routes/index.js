/**
 * @file index.js
 * @description Centralizador de rotas do API Gateway.
 */

const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');

const router = express.Router();

// Rotas de observabilidade do próprio API Gateway
router.use('/', healthRoutes);

// Rotas de proxy reverso do domínio de autenticação
// Suporta a rota canônica versionada /api/v1/auth e também /auth para conveniência
router.use('/api/v1/auth', authRoutes);
router.use('/auth', authRoutes);

module.exports = router;
