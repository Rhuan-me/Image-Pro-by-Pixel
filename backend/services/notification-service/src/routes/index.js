const express = require('express');
const { env } = require('../config/env');

const router = express.Router();

router.get('/health', (req, res) => res.json({
  status: 'UP',
  service: 'notification-service',
  mode: env.nodeEnv
}));

router.get('/live', (req, res) => res.status(200).json({ status: 'ALIVE' }));
router.get('/ready', (req, res) => res.status(200).json({ status: 'READY' }));

module.exports = router;