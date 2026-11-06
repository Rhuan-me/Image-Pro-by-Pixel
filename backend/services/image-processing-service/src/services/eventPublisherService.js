const { v4: uuidv4 } = require('uuid');
const { env } = require('../config/env');
const rabbitmq = require('../config/rabbitmq');

/**
 * Serviço responsável por montar e despachar eventos padronizados para o RabbitMQ
 * conforme a especificação do ADR-005.
 */
class EventPublisherService {
  /**
   * Publica o evento ImageUploaded no Event Bus.
   */
  async publishImageUploaded({ imageRecord, correlationId }) {
    const eventId = uuidv4();
    const timestamp = new Date().toISOString();

    const payload = {
      eventId,
      eventType: 'ImageUploaded',
      timestamp,
      data: {
        imageId: imageRecord.id,
        userId: imageRecord.userId,
        filePath: imageRecord.filePath,
        originalName: imageRecord.originalName,
        mimeType: imageRecord.mimeType,
        s3Key: imageRecord.s3Key || null,
        storageUrl: imageRecord.storageUrl || imageRecord.url || null,
        bucket: 'pixpro-storage'
      }
    };

    console.log(`[EventPublisher] Disparando evento 'ImageUploaded' (ID: ${eventId}) para a imagem ${imageRecord.id}`);

    await rabbitmq.publishEvent(env.rabbitmqRoutingKey, payload, {
      correlationId: correlationId || eventId
    });

    return payload;
  }
}

module.exports = new EventPublisherService();
