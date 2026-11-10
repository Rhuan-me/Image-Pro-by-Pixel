
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

process.env.DATABASE_URL ||= 'postgres://pixpro:password@localhost:5432/pixpro';
process.env.JWT_SECRET ||= 'pixpro-test-secret-key-with-more-than-32-bytes';
process.env.JWT_ISSUER ||= 'pixpro-auth';
process.env.JWT_AUDIENCE ||= 'pixpro-api';
process.env.JWT_EXPIRES_IN ||= '15m';

const redisPath = require.resolve('../src/config/redis');
const redisClient = {
  set: async () => 'OK'
};

const redisModule = new Module(redisPath);
redisModule.filename = redisPath;
redisModule.loaded = true;
redisModule.exports = {
  redisClient,
  redisReady: Promise.resolve()
};
require.cache[redisPath] = redisModule;

const argon2 = require('argon2');
const { UniqueConstraintError } = require('sequelize');
const User = require('../src/models/user.model');
const authService = require('../src/services/auth.service');
const userService = require('../src/services/user.service');
const { verifyToken } = require('../src/config/jwt');

const validUser = {
  id: 'user-123',
  email: 'victor@example.com',
  createdAt: new Date(),
  updatedAt: new Date()
};

test('register deve cadastrar usuário com senha criptografada', async (t) => {
  let savedData;

  t.mock.method(User, 'create', async (data) => {
    savedData = data;
    return { ...validUser, ...data };
  });

  const result = await authService.register({
    email: validUser.email,
    password: 'StrongPass123!'
  });

  assert.equal(result.email, validUser.email);
  assert.equal(result.id, validUser.id);
  assert.equal(savedData.email, validUser.email);
  assert.notEqual(savedData.passwordHash, 'StrongPass123!');
  assert.equal(
    await argon2.verify(savedData.passwordHash, 'StrongPass123!'),
    true
  );
  assert.equal('passwordHash' in result, false);
});

test('register deve retornar erro quando o e-mail já existe', async (t) => {
  t.mock.method(User, 'create', async () => {
    throw new UniqueConstraintError({
      message: 'Duplicate email'
    });
  });

  await assert.rejects(
    authService.register({
      email: validUser.email,
      password: 'StrongPass123!'
    }),
    (error) => {
      assert.equal(error.status, 409);
      assert.equal(error.code, 'EMAIL_ALREADY_EXISTS');
      return true;
    }
  );
});

test('login deve retornar token para credenciais válidas', async (t) => {
  const passwordHash = await argon2.hash('StrongPass123!');

  t.mock.method(User, 'findOne', async () => ({
    ...validUser,
    passwordHash
  }));

  const result = await authService.login({
    email: validUser.email,
    password: 'StrongPass123!'
  });

  assert.ok(result.accessToken);
  assert.equal(result.tokenType, 'Bearer');
  assert.equal(result.user.email, validUser.email);
  assert.deepEqual(result.user.roles, ['user']);

  const payload = await verifyToken(result.accessToken);
  assert.equal(payload.sub, validUser.id);
  assert.equal(payload.email, validUser.email);
});

test('login deve rejeitar usuário inexistente', async (t) => {
  t.mock.method(User, 'findOne', async () => null);

  await assert.rejects(
    authService.login({
      email: validUser.email,
      password: 'StrongPass123!'
    }),
    (error) => {
      assert.equal(error.status, 401);
      assert.equal(error.code, 'INVALID_CREDENTIALS');
      return true;
    }
  );
});

test('login deve rejeitar senha incorreta', async (t) => {
  const passwordHash = await argon2.hash('CorrectPass123!');

  t.mock.method(User, 'findOne', async () => ({
    ...validUser,
    passwordHash
  }));

  await assert.rejects(
    authService.login({
      email: validUser.email,
      password: 'WrongPass123!'
    }),
    (error) => {
      assert.equal(error.status, 401);
      assert.equal(error.code, 'INVALID_CREDENTIALS');
      return true;
    }
  );
});

test('logout deve revogar uma sessão válida no Redis', async (t) => {
  const { redisClient } = require('../src/config/redis');

  const token = await require('../src/config/jwt').signToken({
    userId: validUser.id,
    email: validUser.email,
    roles: ['user']
  });

  const setMock = t.mock.method(redisClient, 'set', async () => 'OK');

  const result = await authService.logout(token);

  assert.deepEqual(result, { revoked: true });
  assert.equal(setMock.mock.callCount(), 1);

  const [key, value, options] = setMock.mock.calls[0].arguments;

  assert.match(key, /^pixpro:auth:revoked:/);
  assert.equal(value, '1');
  assert.ok(options.EX > 0);
});

test('logout deve rejeitar token inválido', async () => {
  await assert.rejects(
    authService.logout('invalid-token'),
    (error) => {
      assert.equal(error.status, 401);
      assert.equal(error.code, 'INVALID_TOKEN');
      return true;
    }
  );
});

test('logout deve retornar erro quando Redis estiver indisponível', async (t) => {
  const { redisClient } = require('../src/config/redis');

  const token = await require('../src/config/jwt').signToken({
    userId: validUser.id,
    email: validUser.email,
    roles: ['user']
  });

  t.mock.method(redisClient, 'set', async () => {
    throw new Error('Redis unavailable');
  });

  await assert.rejects(
    authService.logout(token),
    (error) => {
      assert.equal(error.status, 503);
      assert.equal(error.code, 'SESSION_STORE_UNAVAILABLE');
      return true;
    }
  );
});

test('getProfile deve retornar os dados públicos do usuário', async (t) => {
  t.mock.method(User, 'findByPk', async () => validUser);

  const result = await userService.getProfile(validUser.id);

  assert.equal(result.id, validUser.id);
  assert.equal(result.email, validUser.email);
  assert.equal('passwordHash' in result, false);
});

test('getProfile deve retornar 404 quando usuário não existe', async (t) => {
  t.mock.method(User, 'findByPk', async () => null);

  await assert.rejects(
    userService.getProfile('unknown-user'),
    (error) => {
      assert.equal(error.status, 404);
      assert.equal(error.code, 'USER_NOT_FOUND');
      return true;
    }
  );
});

test('updateProfile deve atualizar o e-mail do usuário', async (t) => {
  const user = {
    ...validUser,
    update: async function (data) {
      Object.assign(this, data);
    }
  };

  t.mock.method(User, 'findByPk', async () => user);

  const result = await userService.updateProfile(validUser.id, {
    email: 'new@example.com'
  });

  assert.equal(result.email, 'new@example.com');
});

test('updateProfile deve rejeitar e-mail duplicado', async (t) => {
  const user = {
    ...validUser,
    update: async () => {
      throw new UniqueConstraintError({
        message: 'Duplicate email'
      });
    }
  };

  t.mock.method(User, 'findByPk', async () => user);

  await assert.rejects(
    userService.updateProfile(validUser.id, {
      email: 'existing@example.com'
    }),
    (error) => {
      assert.equal(error.status, 409);
      assert.equal(error.code, 'EMAIL_ALREADY_EXISTS');
      return true;
    }
  );
});

test('updateProfile deve retornar 404 quando usuário não existe', async (t) => {
  t.mock.method(User, 'findByPk', async () => null);

  await assert.rejects(
    userService.updateProfile('unknown-user', {
      email: 'new@example.com'
    }),
    (error) => {
      assert.equal(error.status, 404);
      assert.equal(error.code, 'USER_NOT_FOUND');
      return true;
    }
  );
});
