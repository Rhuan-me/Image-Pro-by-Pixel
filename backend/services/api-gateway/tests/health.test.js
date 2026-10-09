const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const createApp = require('../src/app');

describe('API Gateway — Health & Transversal Middlewares', () => {
  const app = createApp();

  it('GET /health deve retornar status 200 e informações do gateway', async () => {
    const res = await request(app).get('/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'UP');
    assert.equal(res.body.service, 'api-gateway');
    assert.ok(res.body.timestamp);
    assert.ok(res.body.downstreamServices.auth);
    assert.ok(res.headers['x-correlation-id']);
  });

  it('GET /live deve retornar 200 ALIVE para probes de liveness', async () => {
    const res = await request(app).get('/live');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ALIVE');
  });

  it('Deve aplicar headers de segurança Helmet e CORS', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:3000');

    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:3000');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
    assert.ok(res.headers['x-content-type-options']); // Helmet
  });

  it('Deve retornar 404 padronizado para rotas inexistentes', async () => {
    const res = await request(app).get('/rota-inexistente');

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'ROUTE_NOT_FOUND');
    assert.equal(res.body.error.status, 404);
    assert.ok(res.body.error.timestamp);
    assert.equal(res.body.error.path, '/rota-inexistente');
  });
});
