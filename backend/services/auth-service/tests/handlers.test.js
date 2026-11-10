const test = require('node:test');
const assert = require('node:assert/strict');
const { RegisterCommand } = require('../src/commands/register.command');
const { LoginCommand } = require('../src/commands/login.command');
const { GetUserQuery } = require('../src/queries/getUser.query');
const { createRegisterHandler } = require('../src/handlers/register.handler');
const { createLoginHandler } = require('../src/handlers/login.handler');
const { createGetUserHandler } = require('../src/handlers/getUser.handler');

const user = {
  id: 'usr_1',
  email: 'user@pixpro.dev',
  passwordHash: 'hash',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z')
};

test('RegisterHandler registra e publica UserRegistered', async () => {
  const published = [];
  const handler = createRegisterHandler({
    userRepository: { create: async (data) => ({ ...user, ...data }) },
    passwordHasher: { hash: async () => 'novo-hash' },
    isUniqueConstraintError: () => false,
    publishUserRegistered: async (publicUser) => published.push(publicUser)
  });

  const result = await handler(new RegisterCommand({ email: user.email, password: 'senha-segura' }));

  assert.equal(result.email, user.email);
  assert.equal(published.length, 1);
  assert.equal(published[0].id, user.id);
  assert.equal(Object.hasOwn(published[0], 'passwordHash'), false);
});

test('LoginHandler autentica e publica UserLoggedIn', async () => {
  const published = [];
  const handler = createLoginHandler({
    userRepository: { findByEmail: async () => user },
    passwordHasher: { verify: async () => true },
    tokenSigner: async () => 'access-token',
    publishUserLoggedIn: async (publicUser) => published.push(publicUser)
  });

  const result = await handler(new LoginCommand({ email: user.email, password: 'senha-segura' }));

  assert.equal(result.accessToken, 'access-token');
  assert.equal(published.length, 1);
  assert.equal(published[0].email, user.email);
  assert.equal(Object.hasOwn(published[0], 'passwordHash'), false);
});

test('LoginHandler mantém erro de credenciais inválidas e não publica evento', async () => {
  let published = 0;
  const handler = createLoginHandler({
    userRepository: { findByEmail: async () => user },
    passwordHasher: { verify: async () => false },
    tokenSigner: async () => assert.fail('não deve assinar token'),
    publishUserLoggedIn: async () => { published += 1; }
  });

  await assert.rejects(
    handler(new LoginCommand({ email: user.email, password: 'incorreta' })),
    (error) => error.status === 401 && error.code === 'INVALID_CREDENTIALS' && error.message === 'E-mail ou senha incorretos.'
  );
  assert.equal(published, 0);
});

test('falha ao publicar evento não derruba registro nem login', async () => {
  const register = createRegisterHandler({
    userRepository: { create: async () => user },
    passwordHasher: { hash: async () => 'novo-hash' },
    isUniqueConstraintError: () => false,
    publishUserRegistered: async () => { throw new Error('broker fora'); }
  });
  const login = createLoginHandler({
    userRepository: { findByEmail: async () => user },
    passwordHasher: { verify: async () => true },
    tokenSigner: async () => 'access-token',
    publishUserLoggedIn: async () => { throw new Error('broker fora'); }
  });

  assert.equal((await register(new RegisterCommand({ email: user.email, password: 'senha' }))).id, user.id);
  assert.equal((await login(new LoginCommand({ email: user.email, password: 'senha' }))).accessToken, 'access-token');
});

test('GetUserHandler devolve perfil sem campos sensíveis e mantém 404 para usuário inexistente', async () => {
  const getUser = createGetUserHandler({ userRepository: { findById: async () => user } });
  const profile = await getUser(new GetUserQuery({ userId: user.id }));

  assert.equal(profile.email, user.email);
  assert.equal(Object.hasOwn(profile, 'passwordHash'), false);

  const missing = createGetUserHandler({ userRepository: { findById: async () => null } });
  await assert.rejects(
    missing(new GetUserQuery({ userId: 'inexistente' })),
    (error) => error.status === 404 && error.code === 'USER_NOT_FOUND' && error.message === 'Usuário não encontrado.'
  );
});
