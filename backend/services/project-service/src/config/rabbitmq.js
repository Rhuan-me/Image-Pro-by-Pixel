const amqp = require('amqplib');

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://pixpro:dev-rabbit-password@localhost:5672';
const exchange = 'pixpro.events';
let connection = null;
let channel = null;

async function getChannel() {
  if (channel) return channel;

  connection = await amqp.connect(rabbitmqUrl, { timeout: 1000 });
  connection.on('close', () => {
    connection = null;
    channel = null;
  });
  connection.on('error', () => {});

  channel = await connection.createChannel();
  await channel.assertExchange(exchange, 'topic', { durable: true });
  return channel;
}

async function publishEvent(routingKey, event) {
  const activeChannel = await getChannel();
  return activeChannel.publish(exchange, routingKey, Buffer.from(JSON.stringify(event)), {
    persistent: true,
    contentType: 'application/json',
    messageId: event.eventId
  });
}

module.exports = { publishEvent };
