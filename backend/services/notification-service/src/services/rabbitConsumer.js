const amqp = require('amqplib');
const { env } = require('../config/env');
const { publishToBackplane, deliverLocalNotification } = require('./redisBackplane');

async function startRabbitConsumer(activeConnections) {
  try {
    const rabbitUrl = env.rabbitmqUrl || 'amqp://pixpro:dev-rabbit-password@rabbitmq:5672';
    console.log(`[RabbitMQ Consumer][${env.instanceId}] Conectando ao broker em ${rabbitUrl.replace(/:[^:@]+@/, ':***@')}...`);

    const connection = await amqp.connect(rabbitUrl);
    const channel = await connection.createChannel();

    const exchange = env.rabbitmqExchange || 'pixpro.events';
    const queueName = env.rabbitmqQueue || 'image-queue';
    const routingKey = env.rabbitmqRoutingKey || 'image.uploaded';

    await channel.assertExchange(exchange, 'topic', { durable: true });
    await channel.bindQueue(queueName, exchange, routingKey);

    console.log(`[RabbitMQ Consumer][${env.instanceId}] Conectado e escutando fila '${queueName}' (routing key '${routingKey}').`);

    channel.consume(queueName, async (msg) => {
      if (msg !== null) {
        try {
          const rawContent = JSON.parse(msg.content.toString());
          console.log(`[RabbitMQ Consumer][${env.instanceId}] Evento recebido:`, rawContent);

          const eventData = rawContent.data || rawContent;
          const userId = eventData.userId;
          const isSuccess = eventData.status === 'COMPLETED' || eventData.status === 'PROCESSED' || rawContent.eventType === 'ImageProcessed';

          const notificationPayload = {
            type: 'NOTIFICATION',
            event: rawContent.eventType || 'ImageStatusChanged',
            data: {
              imageId: eventData.imageId,
              userId,
              status: eventData.status || (isSuccess ? 'PROCESSED' : 'PENDING'),
              processedStorageUrl: eventData.processedStorageUrl,
              message: isSuccess
                ? 'Sua imagem foi processada com sucesso!'
                : 'Atualização no processamento da imagem.'
            },
            timestamp: Date.now()
          };

          // Publica no Redis Backplane para alcançar o cliente mesmo que esteja conectado em outra instância do hub
          try {
            await publishToBackplane({
              targetUserId: userId || null,
              broadcast: !userId,
              payload: notificationPayload
            });
          } catch (redisErr) {
            console.warn(`[RabbitMQ Consumer][${env.instanceId}] Fallback local (Redis Backplane indisponível): ${redisErr.message}`);
            deliverLocalNotification(activeConnections, {
              eventId: rawContent.eventId || `local-${Date.now()}`,
              originInstance: env.instanceId,
              targetUserId: userId,
              broadcast: !userId,
              payload: notificationPayload,
              timestamp: Date.now()
            });
          }

          channel.ack(msg);
        } catch (err) {
          console.error(`[RabbitMQ Consumer][${env.instanceId}] Erro ao processar mensagem da fila:`, err.message);
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (error) {
    console.error(`[RabbitMQ Consumer][${env.instanceId}] Erro crítico na conexão com o broker:`, error.message);
    setTimeout(() => startRabbitConsumer(activeConnections), 5000);
  }
}

module.exports = { startRabbitConsumer };
