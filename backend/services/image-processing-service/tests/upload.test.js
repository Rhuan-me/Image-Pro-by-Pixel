const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const imageStorageService = require('../src/services/imageStorageService');

describe('Image Upload & Query Endpoints', () => {
  beforeEach(() => {
    imageStorageService.clear();
  });

  it('POST /api/images/upload deve falhar (400) se nenhum arquivo/dado for enviado', async () => {
    const res = await request(app)
      .post('/api/images/upload')
      .send({});

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'MISSING_FILE');
  });

  it('POST /api/images/upload deve rejeitar (400) tipos de arquivo não suportados', async () => {
    const dummyBuffer = Buffer.from('conteudo de texto nao suportado');
    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', dummyBuffer, { filename: 'documento.txt', contentType: 'text/plain' });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('Formato de arquivo inválido') || res.body.message.includes('não suportado'));
  });

  it('POST /api/images/upload deve aceitar upload multipart com sucesso e simular persistência', async () => {
    // 1x1 PNG mínimo em bytes
    const mockImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .post('/api/images/upload')
      .field('userId', 'usr_test_123')
      .attach('image', mockImageBuffer, { filename: 'foto_teste.png', contentType: 'image/png' });

    assert.strictEqual(res.status, 202);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.imageId.startsWith('img_'));
    assert.strictEqual(res.body.data.userId, 'usr_test_123');
    assert.strictEqual(res.body.data.originalName, 'foto_teste.png');
    assert.strictEqual(res.body.data.mimeType, 'image/png');
    assert.strictEqual(res.body.data.status, 'PENDING');
    assert.ok(res.body.data.filePath.includes('/storage/raw/usr_test_123/img_'));
    assert.ok(res.body.data.storageUrl.includes('/pixpro-storage/raw/usr_test_123/img_'));

    // Consulta imediata em memória
    const getRes = await request(app).get(`/api/images/${res.body.data.imageId}`);
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.body.success, true);
    assert.strictEqual(getRes.body.data.id, res.body.data.imageId);
    assert.strictEqual(getRes.body.data.originalName, 'foto_teste.png');
  });

  it('POST /api/images/upload deve rejeitar (413) arquivo que excede o limite de 5MB', async () => {
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024);
    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', largeBuffer, { filename: 'imagem_grande.jpg', contentType: 'image/jpeg' });

    assert.strictEqual(res.status, 413);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'FILE_TOO_LARGE');
  });

  it('POST /api/images/upload deve aceitar metadados de imagem via JSON', async () => {
    const res = await request(app)
      .post('/api/images/upload')
      .send({
        userId: 'usr_json_user',
        originalName: 'avatar.png',
        mimeType: 'image/png'
      });

    assert.strictEqual(res.status, 202);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.userId, 'usr_json_user');
    assert.strictEqual(res.body.data.originalName, 'avatar.png');
    assert.strictEqual(res.body.data.mimeType, 'image/png');
    assert.strictEqual(res.body.data.status, 'PENDING');
  });

  it('GET /api/images/:id deve retornar 404 para ID inexistente', async () => {
    const res = await request(app).get('/api/images/img_inexistente_9999');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'IMAGE_NOT_FOUND');
  });
});
