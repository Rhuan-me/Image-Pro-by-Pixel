/**
 * @file healthRoutes.js
 * @description Endpoints de integridade e observabilidade do próprio API Gateway.
 */

const express = require('express');
const config = require('../config/environment');

const router = express.Router();
const startTime = Date.now();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    environment: config.nodeEnv,
    downstreamServices: {
      auth: {
        name: config.services.auth.name,
        configuredUrl: config.services.auth.url,
      },
      project: {
        name: config.services.project.name,
        configuredUrl: config.services.project.url,
      },
      imageProcessing: {
        name: config.services.imageProcessing.name,
        configuredUrl: config.services.imageProcessing.url,
      },
    },
  });
});

router.get('/live', (req, res) => {
  res.status(200).json({ status: 'ALIVE' });
});

module.exports = router;
