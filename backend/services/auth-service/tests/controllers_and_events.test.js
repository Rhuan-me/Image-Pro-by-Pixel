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

const authController = require('../src/controllers/auth.controller');
const userController = require('../src/controllers/user.controller');
const authService = require('../src/services/auth.service');
const userService = require('../src/services/user.service');
const userEvents = require('../src/events/userEvents');
const rabbitmq = require('../src/config/rabbitmq');
const jwtConfig = require('../src/config/jwt');

test('authController.register returns 201 on success or calls next on error', async () => {
  // Mock req/res
  let nextErr = null;
  const mockRes = {
    status(s) { this.statusCode = s; return this; },
    json(d) { this.body = d; return this; }
  };

  // Error case
  await authController.register({ validatedBody: null }, mockRes, (err) => { nextErr = err; });
  assert.ok(nextErr);
});

test('authController.login returns 200 on success or calls next on error', async () => {
  let nextErr = null;
  const mockRes = {
    status(s) { this.statusCode = s; return this; },
    json(d) { this.body = d; return this; }
  };

  // Error case
  await authController.login({ validatedBody: null }, mockRes, (err) => { nextErr = err; });
  assert.ok(nextErr);
});

test('authController.logout rejects missing header and handles success and error', async () => {
  let status = null;
  let json = null;
  const res = {
    status(s) { status = s; return this; },
    json(j) { json = j; return this; }
  };

  // Missing header
  await authController.logout({ get: () => undefined }, res, () => {});
  assert.equal(status, 401);
  assert.equal(json.error.code, 'UNAUTHORIZED');

  // Success
  const origLogout = authService.logout;
  let logoutCalledWith = null;
  authService.logout = async (token) => { logoutCalledWith = token; };
  try {
    await authController.logout({ get: () => 'Bearer my-token-123' }, res, () => {});
    assert.equal(status, 200);
    assert.equal(logoutCalledWith, 'my-token-123');
    assert.equal(json.message, 'Logout realizado com sucesso.');

    // Error in service
    let nextErr = null;
    authService.logout = async () => { throw new Error('redis crash'); };
    await authController.logout({ get: () => 'Bearer my-token-123' }, res, (err) => { nextErr = err; });
    assert.ok(nextErr);
  } finally {
    authService.logout = origLogout;
  }
});

test('userController.getMe handles error with next', async () => {
  let nextErr = null;
  await userController.getMe({ auth: {} }, {}, (err) => { nextErr = err; });
  assert.ok(nextErr);
});

test('userController.updateMe handles success and error', async () => {
  const origUpdate = userService.updateProfile;
  let status = null;
  let json = null;
  const res = {
    status(s) { status = s; return this; },
    json(j) { json = j; return this; }
  };

  try {
    userService.updateProfile = async (id, data) => ({ id, ...data });
    await userController.updateMe({ auth: { userId: 'u1' }, validatedBody: { email: 'new@pix.com' } }, res, () => {});
    assert.equal(status, 200);
    assert.equal(json.data.id, 'u1');

    let nextErr = null;
    userService.updateProfile = async () => { throw new Error('user not found'); };
    await userController.updateMe({ auth: { userId: 'u1' }, validatedBody: {} }, res, (err) => { nextErr = err; });
    assert.ok(nextErr);
  } finally {
    userService.updateProfile = origUpdate;
  }
});

test('userEvents publishUserRegistered and publishUserLoggedIn call rabbitmq', async () => {
  const origPublish = rabbitmq.publishEvent;
  const published = [];
  rabbitmq.publishEvent = async (queue, data) => { published.push({ queue, data }); };

  try {
    const regEvent = await userEvents.publishUserRegistered({ id: 'u100', email: 'u100@test.com' });
    assert.equal(published[0].queue, 'user.registered');
    assert.equal(regEvent.data.userId, 'u100');

    const logEvent = await userEvents.publishUserLoggedIn({ id: 'u100', email: 'u100@test.com' });
    assert.equal(published[1].queue, 'user.logged_in');
    assert.equal(logEvent.data.email, 'u100@test.com');
  } finally {
    rabbitmq.publishEvent = origPublish;
  }
});

test('jwtConfig signToken validates input params', async () => {
  await assert.rejects(() => jwtConfig.signToken({ userId: '', email: 'a@b.com', roles: [] }));
  await assert.rejects(() => jwtConfig.signToken({ userId: 'u', email: '', roles: [] }));
  await assert.rejects(() => jwtConfig.signToken({ userId: 'u', email: 'a@b.com', roles: 'not-array' }));
});

test('jwtConfig verifyToken rejects tokens with invalid claims', async () => {
  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  // Missing jti
  const tokenNoJti = await new SignJWT({ userId: 'u1', email: 'e', roles: [] })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('u1')
    .setIssuer(process.env.JWT_ISSUER)
    .setAudience(process.env.JWT_AUDIENCE)
    .setExpirationTime('10m')
    .sign(secret);
  await assert.rejects(() => jwtConfig.verifyToken(tokenNoJti), /Claims de sessão inválidos/);

  // Missing sub
  const tokenNoSub = await new SignJWT({ userId: 'u1', email: 'e', roles: [] })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti('jti-1')
    .setIssuer(process.env.JWT_ISSUER)
    .setAudience(process.env.JWT_AUDIENCE)
    .setExpirationTime('10m')
    .sign(secret);
  await assert.rejects(() => jwtConfig.verifyToken(tokenNoSub), /Token sem identificador de usuário/);

  // Mismatched sub and userId
  const tokenMismatch = await new SignJWT({ userId: 'u2', email: 'e', roles: [] })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('u1')
    .setJti('jti-2')
    .setIssuer(process.env.JWT_ISSUER)
    .setAudience(process.env.JWT_AUDIENCE)
    .setExpirationTime('10m')
    .sign(secret);
  await assert.rejects(() => jwtConfig.verifyToken(tokenMismatch), /Claims obrigatórios do token JWT inválidos/);
});
