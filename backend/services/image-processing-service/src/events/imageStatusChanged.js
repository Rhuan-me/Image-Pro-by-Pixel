const { v4: uuidv4 } = require('uuid');
const rabbitmq = require('../config/rabbitmq');

/** Evento de domínio publicado depois que o status de uma imagem muda. */
async function publishImageStatusChanged({ imageId, status, processedStorageUrl, correlationId }) {
    const eventId = uuidv4();
    const payload = {
        eventId,
        eventType: 'ImageStatusChanged',
        timestamp: new Date().toISOString(),
        data: { imageId, status, processedStorageUrl: processedStorageUrl || null }
    };

    await rabbitmq.publishEvent('image.status.changed', payload, {
        correlationId: correlationId || eventId
    });
    return payload;
}

module.exports = { publishImageStatusChanged };