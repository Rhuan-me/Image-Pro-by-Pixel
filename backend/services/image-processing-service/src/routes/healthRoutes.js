const express = require('express');
const { isRabbitMQConnected } = require('../config/rabbitmq');
const { isDatabaseConnected } = require('../config/database');

const router = express.Router();

router.get('/health', (req, res) => {
  const rabbit = isRabbitMQConnected();
  const db = isDatabaseConnected();

  res.status(200).json({
    status: 'UP',
    service: 'image-processing-service',
    timestamp: new Date().toISOString(),
    dependencies: {
      rabbitmq: rabbit ? 'CONNECTED' : 'DISCONNECTED',
      database: db ? 'CONNECTED' : 'STANDBY_MEMORY_MODE'
    }
  });
});

router.get('/live', (req, res) => {
  res.status(200).json({ status: 'ALIVE' });
});

router.get('/ready', (req, res) => {
  res.status(200).json({ status: 'READY' });
});

module.exports = router;
