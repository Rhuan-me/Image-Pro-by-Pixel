const express = require('express');
const { env } = require('../config/env');
const { publishToBackplane, isBackplaneSubscribed } = require('../services/redisBackplane');

const router = express.Router();

router.get('/health', (req, res) => res.json({
  status: 'UP',
  service: 'notification-service',
  instanceId: env.instanceId,
  port: env.port,
  backplaneChannel: env.redisBackplaneChannel,
  backplaneSubscribed: isBackplaneSubscribed(),
  mode: env.nodeEnv
}));

router.get('/live', (req, res) => res.status(200).json({ status: 'ALIVE', instanceId: env.instanceId }));
router.get('/ready', (req, res) => res.status(200).json({ status: 'READY', instanceId: env.instanceId }));

/**
 * Endpoint HTTP para publicar uma notificação ou broadcast no Redis Backplane
 * a partir de uma instância específica e propagar para todas as demais instâncias do hub.
 */
router.post(['/notify', '/broadcast'], async (req, res, next) => {
  try {
    const { targetUserId = null, broadcast = false, event = 'CustomNotification', message = 'Notificação via Redis Backplane', data = {} } = req.body || {};

    const envelope = await publishToBackplane({
      targetUserId,
      broadcast: Boolean(broadcast || !targetUserId || req.path === '/broadcast'),
      payload: {
        type: 'NOTIFICATION',
        event,
        data: {
          ...data,
          message
        },
        timestamp: Date.now()
      }
    });

    return res.status(202).json({
      status: 'PUBLISHED_TO_BACKPLANE',
      instanceId: env.instanceId,
      channel: env.redisBackplaneChannel,
      envelope
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
