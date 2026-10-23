const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

describe('Health & Diagnostic Endpoints', () => {
  it('GET /health deve retornar status 200 com informações do serviço', async () => {
    const response = await request(app).get('/health');
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.status, 'UP');
    assert.strictEqual(response.body.service, 'image-processing-service');
    assert.ok(response.body.dependencies);
  });

  it('GET /live deve retornar 200 ALIVE', async () => {
    const response = await request(app).get('/live');
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.status, 'ALIVE');
  });

  it('GET /ready deve retornar 200 READY', async () => {
    const response = await request(app).get('/ready');
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.status, 'READY');
  });
});
