const amqp = require('amqplib');

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://pixpro:dev-rabbit-password@localhost:5672';
const exchange = 'pixpro.events';
let channelPromise = null;

/** Conexão preguiçosa e compartilhada: chamadas simultâneas esperam a mesma tentativa. */
function getChannel() {
  if (!channelPromise) {
    channelPromise = (async () => {
      const conn = await amqp.connect(rabbitmqUrl, { timeout: 1000 });
      conn.on('error', () => {});
      conn.on('close', () => { channelPromise = null; });

      try {
        const ch = await conn.createChannel();
        ch.on('error', () => {});
        ch.on('close', () => {
          channelPromise = null;
          conn.close().catch(() => {}); // canal caiu: força uma conexão nova na próxima publicação
        });
        await ch.assertExchange(exchange, 'topic', { durable: true });
        return ch;
      } catch (err) {
        await conn.close().catch(() => {});
        throw err;
      }
    })().catch((err) => {
      channelPromise = null;
      throw err;
    });
  }
  return channelPromise;
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
