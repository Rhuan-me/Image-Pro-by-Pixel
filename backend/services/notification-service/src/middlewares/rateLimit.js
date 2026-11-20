const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { env } = require('../config/env');
const { redisClient, redisReady, isTest } = require('../config/redis');

function createLimiter({ limit, prefix }) {
  const options = {
    windowMs: env.rateLimitWindowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req, res) => ipKeyGenerator(req, res),
    handler: (req, res) => res.status(429).json({ 
      error: { 
        code: 'RATE_LIMIT_EXCEEDED', 
        message: 'Muitas requisições. Tente novamente mais tarde.', 
        correlationId: req.correlationId 
      } 
    })
  };

  if (!isTest) {
    options.store = new RedisStore({
      prefix: `${env.redisKeyPrefix || 'pixpro:'}${prefix}:`,
      sendCommand: (...args) => redisClient.sendCommand(args)
    });
  }

  return rateLimit(options);
}

module.exports = { 
  redisClient, 
  redisReady, 
  generalLimiter: createLimiter({ limit: env.rateLimitMax, prefix: 'notification-general' }), 
  authLimiter: createLimiter({ limit: env.authRateLimitMax, prefix: 'notification-auth' }) 
};