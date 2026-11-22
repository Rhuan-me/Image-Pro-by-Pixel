const { EventEmitter } = require('node:events');
const { createClient } = require('redis');
const { env } = require('./env');

const isTest = process.env.NODE_ENV === 'test';
const testBus = new EventEmitter();

let redisClient = null;
let redisReady = Promise.resolve();

if (!isTest) {
  redisClient = createClient({ url: env.redisUrl });
  redisClient.on('error', (err) => console.error(`[Redis][${env.instanceId}] Erro no cliente principal:`, err.message));
  redisReady = redisClient.connect();
} else {
  // Seguro para o ambiente de testes (inclui barramento Pub/Sub em memória)
  redisClient = {
    isOpen: true,
    get: async () => null,
    publish: async (channel, message) => {
      testBus.emit(channel, message);
      return 1;
    },
    duplicate: () => ({
      isOpen: true,
      on: () => {},
      connect: async () => {},
      subscribe: async (channel, listener) => {
        testBus.on(channel, (msg) => listener(msg, channel));
      },
      unsubscribe: async (channel) => {
        testBus.removeAllListeners(channel);
      },
      quit: async () => {}
    }),
    sendCommand: async () => {},
    quit: async () => {}
  };
}

function createRedisSubscriber() {
  if (redisClient && typeof redisClient.duplicate === 'function') {
    const sub = redisClient.duplicate();
    sub.on('error', (err) => console.error(`[Redis Sub][${env.instanceId}] Erro no subscriber:`, err.message));
    return sub;
  }
  const sub = createClient({ url: env.redisUrl });
  sub.on('error', (err) => console.error(`[Redis Sub][${env.instanceId}] Erro no subscriber:`, err.message));
  return sub;
}

module.exports = {
  redisClient,
  redisReady,
  createRedisSubscriber,
  isTest
};
