const test = require('node:test');
const assert = require('node:assert');

test('RabbitMQ publishEvent module loads and exports correctly', async () => {
  // Mock amqplib before requiring the module if needed, or test basic export
  const rabbit = require('../../src/config/rabbitmq');
  assert.strictEqual(typeof rabbit.publishEvent, 'function');
});