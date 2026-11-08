
const test = require('node:test');
const assert = require('node:assert/strict');
const { SignJWT } = require('jose');

process.env.JWT_ENABLED = 'true';
process.env.JWT_SECRET = 'pixpro-test-secret-with-at-least-32-bytes';
process.env.JWT_ALGORITHMS = 'HS256';
process.env.JWT_ISSUER = 'pixpro-auth-service'; // <--- Adicionado
process.env.JWT_AUDIENCE = 'pixpro-api';
process.env.PUBLIC_AUTH_PATHS = '/api/auth/login,/api/auth/register';
process.env.NODE_ENV = 'test';
process.env.REDIS_ENABLED = 'false';

const { authMiddleware } = require('../src/middlewares/auth');

function mockRequest(path, authorization = '') {
  return {
    path,
    correlationId: 'test-correlation-id',
    get: (header) =>
      header.toLowerCase() === 'authorization'
        ? authorization
        : undefined
  };
}

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

async function createToken(expiration = '15m') {
  const now = Math.floor(Date.now() / 1000);
  
  let exp;
  if (expiration.startsWith('-') || expiration === '-1s') {
    exp = now - 10; 
  } else {
    exp = now + 900; 
  }

  return new SignJWT({ userId: 'test-user-id', roles: ['user'] })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject('test-user-id')
    .setJti('test-jti-uuid-unique-123')
    .setIssuer(process.env.JWT_ISSUER || 'pixpro-auth-service')
    .setAudience(process.env.JWT_AUDIENCE || 'pixpro-api')   
    .setIssuedAt(now - 60)
    .setExpirationTime(exp)
    .sign(
      new TextEncoder().encode(process.env.JWT_SECRET)
    );
}

test('rota de login pública não exige token', async () => {
  const req = mockRequest('/api/auth/login');
  const res = mockResponse();
  let nextCalled = false;

  await authMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('rota protegida sem token retorna 401', async () => {
  const req = mockRequest('/api/projects');
  const res = mockResponse();

  await authMiddleware(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, 'UNAUTHORIZED');
});

test('token inválido retorna 401', async () => {
  const req = mockRequest(
    '/api/projects',
    'Bearer abc123'
  );
  const res = mockResponse();

  await authMiddleware(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, 'INVALID_TOKEN');
});

test('JWT válido permite continuar para a rota protegida', async () => {
  const token = await createToken();
  const req = mockRequest(
    '/api/projects',
    `Bearer ${token}`
  );
  const res = mockResponse();
  let nextCalled = false;

  await authMiddleware(req, res, () => {
    nextCalled = true;
  });

  console.log("nextCalled: ", nextCalled)
  console.log("req: ", req)
  assert.equal(nextCalled, true);
  assert.equal(req.auth.subject, 'test-user-id');
});

test('JWT expirado retorna 401', async () => {
  const token = await createToken('-1s');
  const req = mockRequest(
    '/api/projects',
    `Bearer ${token}`
  );
  const res = mockResponse();

  await authMiddleware(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, 'INVALID_TOKEN');
});
