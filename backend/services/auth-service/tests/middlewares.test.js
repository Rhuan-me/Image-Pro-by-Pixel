const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

process.env.DATABASE_URL ||= 'postgres://pixpro:password@localhost:5432/pixpro';
process.env.JWT_SECRET ||= 'pixpro-test-secret-key-with-more-than-32-bytes';
process.env.JWT_ISSUER ||= 'pixpro-auth';
process.env.JWT_AUDIENCE ||= 'pixpro-api';
process.env.JWT_EXPIRES_IN ||= '15m';

const redisPath = require.resolve('../src/config/redis');
if (!require.cache[redisPath]) {
  const redisModule = new Module(redisPath);
  redisModule.filename = redisPath;
  redisModule.loaded = true;
  redisModule.exports = {
    redisClient: { set: async () => 'OK', get: async () => null, quit: async () => {} },
    redisReady: Promise.resolve()
  };
  require.cache[redisPath] = redisModule;
}

const { z } = require('zod');
const { validate } = require('../src/middlewares/validate.middleware');
const { authenticate } = require('../src/middlewares/authenticate.middleware');
const { errorHandler } = require('../src/middlewares/error.middleware');
const requestContext = require('../src/middlewares/requestContext');
const jwtConfig = require('../src/config/jwt');

test('validate middleware allows valid body and attaches validatedBody', () => {
  const schema = z.object({ name: z.string() });
  const middleware = validate(schema);
  const req = { body: { name: 'PixPro' } };
  let nextCalled = false;
  middleware(req, {}, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.validatedBody.name, 'PixPro');
});

test('validate middleware returns 400 on invalid body', () => {
  const schema = z.object({ name: z.string() });
  const middleware = validate(schema);
  let status = null;
  let json = null;
  const res = {
    status(s) { status = s; return this; },
    json(j) { json = j; return this; }
  };
  middleware({ body: { name: 123 } }, res, () => {});
  assert.equal(status, 400);
  assert.equal(json.error.code, 'VALIDATION_ERROR');
  assert.ok(json.error.details.length > 0);
});

test('authenticate middleware rejects missing or invalid header', async () => {
  let status = null;
  let json = null;
  const res = {
    status(s) { status = s; return this; },
    json(j) { json = j; return this; }
  };

  await authenticate({ get: () => undefined }, res, () => {});
  assert.equal(status, 401);
  assert.equal(json.error.code, 'AUTHENTICATION_REQUIRED');

  await authenticate({ get: () => 'Basic xyz' }, res, () => {});
  assert.equal(status, 401);
  assert.equal(json.error.code, 'AUTHENTICATION_REQUIRED');

  await authenticate({ get: () => 'Bearer  ' }, res, () => {});
  assert.equal(status, 401);
  assert.equal(json.error.code, 'INVALID_TOKEN');

  await authenticate({ get: () => 'Bearer a b' }, res, () => {});
  assert.equal(status, 401);
  assert.equal(json.error.code, 'INVALID_TOKEN');
});

test('authenticate middleware sets req.auth on valid token and rejects invalid token', async () => {
  let status = null;
  let json = null;
  const res = {
    status(s) { status = s; return this; },
    json(j) { json = j; return this; }
  };

  // Invalid token
  await authenticate({ get: () => 'Bearer invalid-token' }, res, () => {});
  assert.equal(status, 401);
  assert.equal(json.error.code, 'INVALID_TOKEN');

  // Valid token
  const token = await jwtConfig.signToken({
    userId: 'user-auth-123',
    email: 'user@pixpro.com',
    roles: ['admin']
  });

  const req = { get: () => `Bearer ${token}` };
  let nextCalled = false;
  await authenticate(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.auth.userId, 'user-auth-123');
});

test('errorHandler passes through when headersSent is true', () => {
  let nextError = null;
  errorHandler(new Error('err'), {}, { headersSent: true }, (e) => { nextError = e; });
  assert.ok(nextError);
});

test('errorHandler handles entity.too.large error', () => {
  let status = null;
  let json = null;
  const res = {
    headersSent: false,
    status(s) { status = s; return this; },
    json(j) { json = j; return this; }
  };
  const err = new Error('too big');
  err.type = 'entity.too.large';
  errorHandler(err, { correlationId: 'cid-payload' }, res, () => {});
  assert.equal(status, 413);
  assert.equal(json.error.code, 'PAYLOAD_TOO_LARGE');
  assert.equal(json.correlationId, 'cid-payload');
});

test('errorHandler handles 500 error with masked message', () => {
  let status = null;
  let json = null;
  const res = {
    headersSent: false,
    status(s) { status = s; return this; },
    json(j) { json = j; return this; }
  };
  const err = new Error('db crashed');
  errorHandler(err, {}, res, () => {});
  assert.equal(status, 500);
  assert.equal(json.error.code, 'INTERNAL_SERVER_ERROR');
  assert.equal(json.error.message, 'Ocorreu um erro interno no servidor.');
});

test('requestContext sets correlationId from valid header or generates new one', () => {
  const reqWithHeader = { get: (h) => (h === 'x-correlation-id' ? 'custom-id-123' : undefined) };
  let setHeaderVal = null;
  const res = { setHeader: (k, v) => { if (k === 'X-Correlation-Id') setHeaderVal = v; } };
  let nextCalled = false;
  requestContext(reqWithHeader, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(reqWithHeader.correlationId, 'custom-id-123');
  assert.equal(setHeaderVal, 'custom-id-123');

  const reqWithoutHeader = { get: () => undefined };
  requestContext(reqWithoutHeader, res, () => {});
  assert.ok(reqWithoutHeader.correlationId);
  assert.equal(reqWithoutHeader.correlationId.length, 36);
});
