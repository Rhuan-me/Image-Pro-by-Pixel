const amqp = require('amqplib');
const { env } = require('../config/env');

async function startRabbitConsumer(activeConnections) {
  try {
    const rabbitUrl = env.rabbitmqUrl || 'amqp://pixpro:dev-rabbit-password@rabbitmq:5672';
    console.log(`[RabbitMQ Consumer] Conectando ao broker em ${rabbitUrl.replace(/:[^:@]+@/, ':***@')}...`);
    
    const connection = await amqp.connect(rabbitUrl);
    const channel = await connection.createChannel();

    const exchange = env.rabbitmqExchange || 'pixpro.events';
    const queueName = env.rabbitmqQueue || 'image-queue';
    const routingKey = env.rabbitmqRoutingKey || 'image.uploaded'; 

    // Garante apenas a Exchange. A fila 'image-queue' já foi declarada pelo worker de processamento.
    await channel.assertExchange(exchange, 'topic', { durable: true });
    await channel.bindQueue(queueName, exchange, routingKey);

    console.log(`[RabbitMQ Consumer] Conectado e escutando fila existente '${queueName}' com a routing key '${routingKey}'.`);

    channel.consume(queueName, (msg) => {
      if (msg !== null) {
        try {
          const rawContent = JSON.parse(msg.content.toString());
          console.log('[RabbitMQ Consumer] Evento recebido:', rawContent);

          const eventData = rawContent.data || rawContent;
          const userId = eventData.userId;
          
          if (userId && activeConnections.has(userId)) {
            const clientWs = activeConnections.get(userId);

            clientWs.send(JSON.stringify({
              type: 'NOTIFICATION',
              event: rawContent.eventType || 'ImageStatusChanged',
              data: {
                imageId: eventData.imageId,
                status: eventData.status,
                processedStorageUrl: eventData.processedStorageUrl,
                message: eventData.status === 'COMPLETED' ? 'Sua imagem foi processada com sucesso!' : 'Falha no processamento da imagem.'
              },
              timestamp: Date.now()
            }));

            console.log(`[WebSocket] Notificação despachada para o usuário ID: ${userId}`);
          } else {
            console.log(`[WebSocket] Usuário ${userId || 'desconhecido'} não conectado via WSS. Mensagem confirmada (ack).`);
          }

          channel.ack(msg);
        } catch (err) {
          console.error('[RabbitMQ Consumer] Erro ao processar mensagem da fila:', err.message);
          channel.nack(msg, false, false);
        }
      }
    });

  } catch (error) {
    console.error('[RabbitMQ Consumer] Erro crítico na conexão com o broker:', error.message);
    setTimeout(() => startRabbitConsumer(activeConnections), 5000);
  }
}

module.exports = { startRabbitConsumer };