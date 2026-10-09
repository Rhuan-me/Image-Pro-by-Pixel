const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const request = require('supertest');

describe('API Gateway — Proxy Reverso para Auth Service', () => {
  let mockAuthServer;
  let mockPort;
  let app;
  let receivedRequests = [];

  before(async () => {
    // 1. Cria um servidor HTTP mock simulando o Auth Service
    mockAuthServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        const parsedBody = body ? JSON.parse(body) : null;
        receivedRequests.push({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: parsedBody,
        });

        if (req.url === '/api/v1/auth/login' && req.method === 'POST') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              token: 'jwt-mock-token-pixpro',
              user: { id: 'usr-123', email: parsedBody?.email },
            })
          );
        } else if (req.url === '/api/v1/auth/register' && req.method === 'POST') {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              user: { id: 'usr-456', email: parsedBody?.email },
            })
          );
        } else if (req.url.startsWith('/api/v1/auth/verify')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ valid: true }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Auth route not found in mock' }));
        }
      });
    });

    await new Promise((resolve) => {
      mockAuthServer.listen(0, () => {
        mockPort = mockAuthServer.address().port;
        resolve();
      });
    });

    // 2. Configura a URL do Auth Service para apontar para o mock
    process.env.AUTH_SERVICE_URL = `http://localhost:${mockPort}`;
    process.env.PORT = '8000';
    process.env.NODE_ENV = 'test';

    // Limpa cache de módulos para carregar com a nova env
    delete require.cache[require.resolve('../src/config/environment')];
    delete require.cache[require.resolve('../src/proxy/createServiceProxy')];
    delete require.cache[require.resolve('../src/routes/authRoutes')];
    delete require.cache[require.resolve('../src/routes/index')];
    delete require.cache[require.resolve('../src/app')];

    const createApp = require('../src/app');
    app = createApp();
  });

  after(async () => {
    if (mockAuthServer) {
      await new Promise((resolve) => mockAuthServer.close(resolve));
    }
  });

  it('Deve encaminhar POST /api/v1/auth/login para o Auth Service preservando payload e contrato', async () => {
    receivedRequests = [];
    const payload = { email: 'designer@pixpro.com', password: 'securePassword123' };

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer token-anterior');

    // Valida resposta recebida pelo cliente (contrato intacto)
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.token, 'jwt-mock-token-pixpro');
    assert.equal(res.body.user.email, 'designer@pixpro.com');

    // Valida que o downstream recebeu o request intacto
    assert.equal(receivedRequests.length, 1);
    const downstreamReq = receivedRequests[0];
    assert.equal(downstreamReq.method, 'POST');
    assert.equal(downstreamReq.url, '/api/v1/auth/login');
    assert.deepEqual(downstreamReq.body, payload);
    assert.equal(downstreamReq.headers.authorization, 'Bearer token-anterior');
    assert.ok(downstreamReq.headers['x-correlation-id'], 'Deve propagar X-Correlation-Id');
  });

  it('Deve encaminhar POST /api/v1/auth/register mantendo status code 201 Created', async () => {
    const payload = { email: 'novo@pixpro.com', password: 'SenhaForte456!' };

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(payload)
      .set('Content-Type', 'application/json');

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.id, 'usr-456');
  });

  it('Deve encaminhar GET com query params transparentemente', async () => {
    const res = await request(app).get('/api/v1/auth/verify?token=sampleToken123');

    assert.equal(res.status, 200);
    assert.equal(res.body.valid, true);
  });
});
