const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const rabbitmq = require('../src/config/rabbitmq');

describe('RabbitMQ Event Publishing Validation (ADR-005)', () => {
  it('Deve publicar o evento ImageUploaded com o payload e contrato exatos do ADR-005', async () => {
    let capturedRoutingKey = null;
    let capturedPayload = null;
    let capturedOptions = null;

    // Intercepta a publicação para validar o payload
    const originalPublish = rabbitmq.publishEvent;
    rabbitmq.publishEvent = async (routingKey, payload, options) => {
      capturedRoutingKey = routingKey;
      capturedPayload = payload;
      capturedOptions = options;
      return true;
    };

    try {
      const mockImageBuffer = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;');

      const res = await request(app)
        .post('/api/images/upload')
        .field('userId', 'usr_123456789')
        .attach('image', mockImageBuffer, { filename: 'foto_perfil.jpg', contentType: 'image/jpeg' });

      assert.strictEqual(res.status, 202);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.eventStatus, 'PUBLISHED');

      // Validação da Routing Key
      assert.strictEqual(capturedRoutingKey, 'image.uploaded');

      // Validação da Estrutura do Evento (ADR-005)
      assert.ok(capturedPayload, 'Payload deve ter sido capturado');
      assert.ok(capturedPayload.eventId, 'eventId é obrigatório');
      assert.strictEqual(capturedPayload.eventType, 'ImageUploaded');
      assert.ok(capturedPayload.timestamp, 'timestamp é obrigatório');

      // Validação do Objeto data
      const { data } = capturedPayload;
      assert.ok(data, 'Campo data é obrigatório');
      assert.ok(data.imageId.startsWith('img_'));
      assert.strictEqual(data.userId, 'usr_123456789');
      assert.strictEqual(data.originalName, 'foto_perfil.jpg');
      assert.strictEqual(data.mimeType, 'image/jpeg');
      assert.ok(data.filePath.includes('/storage/raw/usr_123456789/'));
      assert.ok(data.filePath.endsWith('.jpg'));

      // Validação das opções de mensagem RabbitMQ (persistente)
      assert.strictEqual(capturedOptions.correlationId, res.headers['x-correlation-id']);
    } finally {
      rabbitmq.publishEvent = originalPublish;
    }
  });
});
