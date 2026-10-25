const express = require('express');
const { env } = require('../config/env');
const { createProxy } = require('../proxy/createProxy');
const { authLimiter } = require('../middlewares/rateLimit');

const router = express.Router();

router.get('/health', (req, res) => res.json({
  status: 'UP',
  service: 'api-gateway',
  correlationId: req.correlationId
}));

router.get('/live', (req, res) => res.status(200).json({ status: 'ALIVE' }));
router.get('/ready', (req, res) => res.status(200).json({ status: 'READY' }));

// Prefixos são preservados ao encaminhar para os microsserviços.
router.use('/api/auth', authLimiter, createProxy(env.authServiceUrl));
router.use('/api/users', createProxy(env.authServiceUrl));
router.use('/api/v1/auth', authLimiter, createProxy(env.authServiceUrl));
router.use('/auth', authLimiter, createProxy(env.authServiceUrl));

router.use('/api/v1/projects', createProxy(env.projectServiceUrl));
router.use('/api/v1/images', createProxy(env.imageServiceUrl));

module.exports = router;