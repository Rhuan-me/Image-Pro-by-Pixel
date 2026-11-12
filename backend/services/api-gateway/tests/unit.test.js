process.env.NODE_ENV = 'test';
process.env.REDIS_ENABLED = 'false';
process.env.JWT_ENABLED = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'pixpro-test-secret-with-at-least-32-bytes';
process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'pixpro-auth-service';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'pixpro-api';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SignJWT } = require('jose');
const { HttpError, errorHandler } = require('../src/middlewares/errors');
const { requireAuth } = require('../src/middlewares/requireAuth');
const { authMiddleware } = require('../src/middlewares/auth');
const corsMiddleware = require('../src/middlewares/cors');
const { validateEnv, env } = require('../src/config/env');
const { createProxy } = require('../src/proxy/createProxy');

test('HttpError sets status, code, and message', () => {
  const err = new HttpError(400, 'BAD_REQUEST', 'Invalid request body');
  assert.equal(err.status, 400);
  assert.equal(err.code, 'BAD_REQUEST');
  assert.equal(err.message, 'Invalid request body');
  assert.ok(err instanceof Error);
});

test('errorHandler passes through if headersSent is true', () => {
  let nextCalledWith = null;
  const res = { headersSent: true };
  const err = new Error('boom');
  errorHandler(err, {}, res, (e) => { nextCalledWith = e; });
  assert.equal(nextCalledWith, err);
});

test('errorHandler handles HttpError < 500', () => {
  let statusCode = null;
  let responseData = null;
  const req = { correlationId: 'cid-1' };
  const res = {
    headersSent: false,
    status(code) { statusCode = code; return this; },
    json(data) { responseData = data; return this; }
  };
  const err = new HttpError(422, 'UNPROCESSABLE', 'Validation failed');
  errorHandler(err, req, res, () => {});
  assert.equal(statusCode, 422);
  assert.equal(responseData.error.code, 'UNPROCESSABLE');
  assert.equal(responseData.error.message, 'Validation failed');
  assert.equal(responseData.error.correlationId, 'cid-1');
});

test('errorHandler handles status 503 error', () => {
  let statusCode = null;
  let responseData = null;
  const req = { correlationId: 'cid-2' };
  const res = {
    headersSent: false,
    status(code) { statusCode = code; return this; },
    json(data) { responseData = data; return this; }
  };
  const err = new Error('service down');
  err.status = 503;
  errorHandler(err, req, res, () => {});
  assert.equal(statusCode, 503);
  assert.equal(responseData.error.code, 'SERVICE_UNAVAILABLE');
  assert.equal(responseData.error.message, 'Serviço temporariamente indisponível.');
});

test('errorHandler handles generic 500 error', () => {
  let statusCode = null;
  let responseData = null;
  const req = { correlationId: 'cid-3' };
  const res = {
    headersSent: false,
    status(code) { statusCode = code; return this; },
    json(data) { responseData = data; return this; }
  };
  const err = new Error('unexpected error');
  errorHandler(err, req, res, () => {});
  assert.equal(statusCode, 500);
  assert.equal(responseData.error.code, 'INTERNAL_ERROR');
  assert.equal(responseData.error.message, 'Ocorreu um erro interno.');
});

test('requireAuth fails when authorization header is missing or invalid', async () => {
  const req1 = { get: () => undefined };
  let status1 = null;
  let json1 = null;
  const res1 = {
    status(s) { status1 = s; return this; },
    json(j) { json1 = j; return this; }
  };
  await requireAuth(req1, res1, () => {});
  assert.equal(status1, 401);
  assert.equal(json1.error.code, 'AUTHENTICATION_REQUIRED');

  const req2 = { get: () => 'Basic 123' };
  await requireAuth(req2, res1, () => {});
  assert.equal(status1, 401);

  const req3 = { get: () => 'Bearer  ' };
  let status3 = null;
  let json3 = null;
  const res3 = {
    status(s) { status3 = s; return this; },
    json(j) { json3 = j; return this; }
  };
  await requireAuth(req3, res3, () => {});
  assert.equal(status3, 401);
  assert.equal(json3.error.code, 'INVALID_TOKEN');

  const req4 = { get: () => 'Bearer foo bar' };
  await requireAuth(req4, res3, () => {});
  assert.equal(status3, 401);
});

test('requireAuth succeeds with valid token and sets req.auth', async () => {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-456')
    .setIssuer(process.env.JWT_ISSUER || 'pixpro-auth-service')
    .setAudience(process.env.JWT_AUDIENCE || 'pixpro-api')
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));

  const req = {
    get: (header) => (header.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined)
  };
  let nextCalled = false;
  await requireAuth(req, {}, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.auth.userId, 'user-456');
});

test('requireAuth rejects token without sub or invalid signature', async () => {
  const tokenNoSub = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(process.env.JWT_ISSUER || 'pixpro-auth-service')
    .setAudience(process.env.JWT_AUDIENCE || 'pixpro-api')
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));

  const req = {
    get: () => `Bearer ${tokenNoSub}`
  };
  let status = null;
  const res = {
    status(s) { status = s; return this; },
    json() { return this; }
  };
  await requireAuth(req, res, () => {});
  assert.equal(status, 401);
});

test('cors middleware blocks disallowed origins', (t, done) => {
  const req = {
    headers: { origin: 'http://malicious-origin.com' },
    method: 'GET'
  };
  const res = {
    setHeader() {},
    getHeader() {}
  };
  corsMiddleware(req, res, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'Origem não permitida pelo CORS.');
    done();
  });
});

test('validateEnv validates configuration rules', () => {
  const origNodeEnv = env.nodeEnv;
  const origJwtEnabled = env.jwtEnabled;
  const origJwtSecret = env.jwtSecret;
  const origAlgs = env.jwtAlgorithms;
  const origKeyPath = env.jwtPublicKeyPath;
  const origCors = env.corsOrigins;

  try {
    env.nodeEnv = 'test';
    env.jwtEnabled = true;
    env.jwtSecret = 'pixpro-test-secret-with-at-least-32-bytes';
    env.jwtAlgorithms = ['HS256'];
    validateEnv();

    // Rejeita HS256 sem secret
    env.jwtSecret = '';
    assert.throws(() => validateEnv(), /JWT_SECRET é obrigatório para HS256/);
    env.jwtSecret = 'pixpro-test-secret-with-at-least-32-bytes';

    // Rejeita algoritmo assimétrico sem caminho de chave pública
    env.jwtAlgorithms = ['RS256'];
    env.jwtPublicKeyPath = '';
    assert.throws(() => validateEnv(), /JWT_PUBLIC_KEY_PATH é obrigatório para algoritmos assimétricos/);
    env.jwtAlgorithms = ['HS256'];

    // Rejeita CORS com wildcard em produção
    env.nodeEnv = 'production';
    env.corsOrigins = ['*'];
    assert.throws(() => validateEnv(), /Configure CORS_ORIGINS explicitamente/);
  } finally {
    env.nodeEnv = origNodeEnv;
    env.jwtEnabled = origJwtEnabled;
    env.jwtSecret = origJwtSecret;
    env.jwtAlgorithms = origAlgs;
    env.jwtPublicKeyPath = origKeyPath;
    env.corsOrigins = origCors;
  }
});

test('authMiddleware rejects token missing jti or exp', async () => {
  const origJwtEnabled = env.jwtEnabled;
  try {
    env.jwtEnabled = true;

    const token = await new SignJWT({ sub: 'user-1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(process.env.JWT_ISSUER || 'pixpro-auth-service')
      .setAudience(process.env.JWT_AUDIENCE || 'pixpro-api')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET || env.jwtSecret));

    const req = {
      path: '/api/protected',
      get: (h) => (h.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined),
      correlationId: 'cid-no-jti'
    };
    let status = null;
    let body = null;
    const res = {
      status(s) { status = s; return this; },
      json(b) { body = b; return this; }
    };
    await authMiddleware(req, res, () => {});
    assert.equal(status, 401);
    assert.equal(body?.error?.code, 'INVALID_TOKEN');
    assert.equal(body?.error?.message, 'Token sem dados de sessão válidos.');
  } finally {
    env.jwtEnabled = origJwtEnabled;
  }
});

test('createProxy returns proxy middleware function and covers proxy callbacks', async () => {
  const { redisClient } = require('../src/config/redis');
  assert.equal(await redisClient.get(), null);
  await redisClient.sendCommand();
  await redisClient.quit();

  const hpmPath = require.resolve('http-proxy-middleware');
  const origHpmExports = require.cache[hpmPath].exports;
  let capturedOptions = null;
  require.cache[hpmPath].exports = {
    createProxyMiddleware: (opts) => {
      capturedOptions = opts;
      return origHpmExports.createProxyMiddleware(opts);
    }
  };
  delete require.cache[require.resolve('../src/proxy/createProxy')];
  const { createProxy: freshCreateProxy } = require('../src/proxy/createProxy');

  try {
    const proxy = freshCreateProxy('http://localhost:3000');
    assert.equal(typeof proxy, 'function');
    assert.ok(capturedOptions);

    // pathRewrite
    assert.equal(capturedOptions.pathRewrite('/old', { originalUrl: '/api/projects/1' }), '/api/projects/1');

    // on.proxyReq
    const headers = {};
    const fakeProxyReq = { setHeader: (k, v) => { headers[k] = v; } };
    capturedOptions.on.proxyReq(fakeProxyReq, { correlationId: 'cid-99', auth: { userId: 'u-99' } });
    assert.equal(headers['x-correlation-id'], 'cid-99');
    assert.equal(headers['x-user-id'], 'u-99');

    // on.error when headersSent = true
    capturedOptions.on.error(new Error('fail'), {}, { headersSent: true });

    // on.error 503
    let errStatus = null;
    let errPayload = null;
    const fakeRes = {
      headersSent: false,
      writeHead(s) { errStatus = s; },
      end(b) { errPayload = JSON.parse(b); }
    };
    capturedOptions.on.error(new Error('conn refused'), { correlationId: 'cid-503' }, fakeRes);
    assert.equal(errStatus, 503);
    assert.equal(errPayload.error.code, 'UPSTREAM_UNAVAILABLE');

    // on.error 504 timeout
    const timeoutErr = new Error('timed out');
    timeoutErr.code = 'ETIMEDOUT';
    capturedOptions.on.error(timeoutErr, {}, fakeRes);
    assert.equal(errStatus, 504);
    assert.equal(errPayload.error.code, 'UPSTREAM_TIMEOUT');
  } finally {
    require.cache[hpmPath].exports = origHpmExports;
  }
});

test('authMiddleware handles revoked token and redis errors', async () => {
  const { redisClient } = require('../src/config/redis');
  const origGet = redisClient.get;
  const origJwtEnabled = env.jwtEnabled;
  try {
    env.jwtEnabled = true;
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ sub: 'user-revoked' })
      .setProtectedHeader({ alg: 'HS256' })
      .setJti('jti-revoked-1')
      .setIssuedAt(now - 10)
      .setExpirationTime(now + 600)
      .setIssuer(process.env.JWT_ISSUER || 'pixpro-auth-service')
      .setAudience(process.env.JWT_AUDIENCE || 'pixpro-api')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET || env.jwtSecret));

    const req = {
      path: '/api/protected',
      get: (h) => (h.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined),
      correlationId: 'cid-rev'
    };

    // 1. Revoked token -> 401 TOKEN_REVOKED
    redisClient.get = async () => '1';
    let status = null;
    let body = null;
    const res = {
      status(s) { status = s; return this; },
      json(b) { body = b; return this; }
    };
    await authMiddleware(req, res, () => {});
    assert.equal(status, 401);
    assert.equal(body.error.code, 'TOKEN_REVOKED');

    // 2. Redis failure -> 503 SESSION_STORE_UNAVAILABLE
    redisClient.get = async () => { throw new Error('redis down'); };
    await authMiddleware(req, res, () => {});
    assert.equal(status, 503);
    assert.equal(body.error.code, 'SESSION_STORE_UNAVAILABLE');
  } finally {
    redisClient.get = origGet;
    env.jwtEnabled = origJwtEnabled;
  }
});
