const amqp = require('amqplib');
const { env } = require('./env');

let connection = null;
let channel = null;
let isConnected = false;
let isConnecting = false;

/**
 * Inicializa a conexão com o broker RabbitMQ e configura a topologia (Exchange + DLX/DLQ + Queue + Binding).
 */
async function connectRabbitMQ(retryCount = 5, retryDelayMs = 3000) {
  if (channel && isConnected) return channel;
  if (isConnecting) return null;

  isConnecting = true;

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      console.log(`[RabbitMQ] Conectando a ${env.rabbitmqUrl.replace(/:[^:@]+@/, ':***@')} (Tentativa ${attempt}/${retryCount})...`);
      connection = await amqp.connect(env.rabbitmqUrl);

      connection.on('error', (err) => {
        console.error('[RabbitMQ] Erro na conexão:', err.message);
        isConnected = false;
      });

      connection.on('close', () => {
        console.warn('[RabbitMQ] Conexão encerrada.');
        isConnected = false;
        channel = null;
      });

      channel = await connection.createChannel();

      // 1. Declara a Exchange do tipo Topic (durable: true)
      await channel.assertExchange(env.rabbitmqExchange, 'topic', { durable: true });
      console.log(`[RabbitMQ] Exchange '${env.rabbitmqExchange}' (topic) verificada/criada.`);

      // 2. Dead Letter Exchange + DLQ (mensagens rejeitadas pelo worker vão para cá)
      await channel.assertExchange('pixpro.events.dlx', 'direct', { durable: true });
      await channel.assertQueue('image-dlq', { durable: true });
      await channel.bindQueue('image-dlq', 'pixpro.events.dlx', 'image.dead');

      // 3. Fila principal, apontando para o DLX
      await channel.assertQueue(env.rabbitmqQueue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'pixpro.events.dlx',
          'x-dead-letter-routing-key': 'image.dead'
        }
      });
      console.log(`[RabbitMQ] Fila '${env.rabbitmqQueue}' (durable, com DLX) verificada/criada.`);

      // 4. Realiza o Binding da Fila à Exchange com a Routing Key
      await channel.bindQueue(env.rabbitmqQueue, env.rabbitmqExchange, env.rabbitmqRoutingKey);
      console.log(`[RabbitMQ] Fila '${env.rabbitmqQueue}' vinculada à Exchange com routing key '${env.rabbitmqRoutingKey}'.`);

      isConnected = true;
      isConnecting = false;
      return channel;
    } catch (error) {
      console.error(`[RabbitMQ] Falha na tentativa ${attempt}:`, error.message);
      if (attempt < retryCount) {
        console.log(`[RabbitMQ] Aguardando ${retryDelayMs / 1000}s antes da próxima tentativa...`);
        await new Promise(res => setTimeout(res, retryDelayMs));
      }
    }
  }

  isConnecting = false;
  console.warn('[RabbitMQ] Não foi possível conectar ao broker após todas as tentativas. Operando com fallback/resiliência.');
  return null;
}

/**
 * Publica um evento JSON na exchange configurada.
 */
async function publishEvent(routingKey, eventPayload, options = {}) {
  if (!channel || !isConnected) {
    // Tenta reconectar se ainda não estiver conectado
    await connectRabbitMQ(1, 1000);
  }

  if (!channel || !isConnected) {
    throw new Error('Broker RabbitMQ indisponível para publicação do evento.');
  }

  const messageBuffer = Buffer.from(JSON.stringify(eventPayload));
  const publishOptions = {
    persistent: true,
    contentType: 'application/json',
    timestamp: Date.now(),
    messageId: eventPayload.eventId,
    ...options
  };

  const published = channel.publish(
      env.rabbitmqExchange,
      routingKey || env.rabbitmqRoutingKey,
      messageBuffer,
      publishOptions
  );

  if (!published) {
    console.warn(`[RabbitMQ] Buffer de publicação saturado para o evento ${eventPayload.eventId}`);
  }

  return published;
}

function isRabbitMQConnected() {
  return isConnected;
}

async function closeRabbitMQ() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch (err) {
    console.error('[RabbitMQ] Erro ao fechar conexão:', err.message);
  } finally {
    channel = null;
    connection = null;
    isConnected = false;
  }
}

function getChannel() {
  return isConnected ? channel : null;
}

module.exports = {
  connectRabbitMQ,
  publishEvent,
  isRabbitMQConnected,
  closeRabbitMQ,
  getChannel
};