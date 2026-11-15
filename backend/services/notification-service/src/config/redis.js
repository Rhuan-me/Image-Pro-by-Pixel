const { createClient } = require('redis');
const { env } = require('./env');

const isTest = process.env.NODE_ENV === 'test';

let redisClient = null;
let redisReady = Promise.resolve();

if (!isTest) {
  redisClient = createClient({ url: process.env.REDIS_URL || 'redis://:dev-redis-password@redis:6379' });
  redisClient.on('error', (err) => console.error('Redis error:', err.message));
  redisReady = redisClient.connect();
} else {
  // Seguro para o ambiente de testes
  redisClient = {
    isOpen: false,
    get: async () => null,
    sendCommand: async () => {},
    quit: async () => {}
  };
}

module.exports = {
  redisClient,
  redisReady,
  isTest
};