const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

describe('API Gateway — Tratamento de Indisponibilidade de Downstream (503)', () => {
  let app;

  before(() => {
    // Aponta para uma porta TCP fechada / não utilizada para forçar ECONNREFUSED
    process.env.AUTH_SERVICE_URL = 'http://127.0.0.1:59999';
    process.env.PORT = '8000';
    process.env.NODE_ENV = 'test';
    process.env.PROXY_TIMEOUT = '1500';

    delete require.cache[require.resolve('../src/config/environment')];
    delete require.cache[require.resolve('../src/proxy/createServiceProxy')];
    delete require.cache[require.resolve('../src/routes/authRoutes')];
    delete require.cache[require.resolve('../src/routes/index')];
    delete require.cache[require.resolve('../src/app')];

    const createApp = require('../src/app');
    app = createApp();
  });

  it('Deve retornar HTTP 503 com payload de erro padronizado quando o Auth Service estiver fora do ar', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teste@pixpro.com', password: '123' })
      .set('Content-Type', 'application/json');

    assert.equal(res.status, 503);
    assert.ok(res.body.error, 'Deveria conter a chave raiz error');
    assert.equal(res.body.error.code, 'SERVICE_UNAVAILABLE');
    assert.equal(res.body.error.status, 503);
    assert.match(res.body.error.message, /Auth Service/);
    assert.match(res.body.error.message, /indisponível/i);
    assert.ok(res.body.error.timestamp);
    assert.equal(res.body.error.path, '/api/v1/auth/login');
    assert.ok(res.headers['x-correlation-id']);
  });
});
