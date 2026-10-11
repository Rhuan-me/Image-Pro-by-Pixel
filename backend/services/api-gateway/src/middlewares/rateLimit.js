const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { createClient } = require('redis');
const { env } = require('../config/env');

const redisClient = createClient({ url: env.redisUrl });
redisClient.on('error', err => console.error('Redis error:', err.message));
const redisReady = redisClient.connect();

function createLimiter({ limit, prefix }) {
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: req => req.ip,
    store: new RedisStore({
      prefix: `${env.redisKeyPrefix}${prefix}:`,
      sendCommand: (...args) => redisClient.sendCommand(args)
    }),
    handler: (req, res) => res.status(429).json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Muitas requisições. Tente novamente mais tarde.', correlationId: req.correlationId } })
  });
}
module.exports = { redisClient, redisReady, generalLimiter: createLimiter({ limit: env.rateLimitMax, prefix: 'general' }), authLimiter: createLimiter({ limit: env.authRateLimitMax, prefix: 'auth' }) };
