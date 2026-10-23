const express = require('express');
const healthRoutes = require('./healthRoutes');
const imageRoutes = require('./imageRoutes');

const router = express.Router();

// Rotas de diagnóstico
router.use('/', healthRoutes);

// Rotas de imagens (compatível com chamadas diretas e roteamento do API Gateway)
router.use('/api/images', imageRoutes);
router.use('/api/v1/images', imageRoutes);
router.use('/images', imageRoutes);

module.exports = router;
