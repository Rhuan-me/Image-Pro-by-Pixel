const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'uma_chave_secreta_super_segura_com_mais_de_32_bytes_aqui';
process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'pixpro-auth-service';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'pixpro-api';
process.env.JWT_ENABLED = 'false';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.NODE_ENV = 'test';
process.env.REDIS_ENABLED = 'false';

const app = require('../src/app');

test('GET /health retorna status sem expor URLs internas', async () => {
  const response = await request(app).get('/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'UP');
  assert.equal(response.body.authServiceUrl, undefined);
});

test('GET /live retorna ALIVE', async () => {
  const response = await request(app).get('/live');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ALIVE');
});

test('requisição recebe correlation id', async () => {
  const response = await request(app).get('/health').set('x-correlation-id', 'test-123');
  assert.equal(response.headers['x-correlation-id'], 'test-123');
});

test('rota inexistente retorna erro padronizado', async () => {
  const response = await request(app).get('/not-found');
  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'ROUTE_NOT_FOUND');
});