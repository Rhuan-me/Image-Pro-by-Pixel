
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { registerSchema } = require('../src/schemas/register.schema');
const { loginSchema } = require('../src/schemas/login.schema');
const { updateProfileSchema } = require('../src/schemas/update-profile.schema');

test('register deve aceitar dados válidos e normalizar e-mail', () => {
  const result = registerSchema.safeParse({
    email: '  VICTOR@EXAMPLE.COM  ',
    password: 'StrongPass123!'
  });

  assert.equal(result.success, true);
  assert.equal(result.data.email, 'victor@example.com');
});

test('register deve rejeitar e-mail inválido', () => {
  const result = registerSchema.safeParse({
    email: 'invalid-email',
    password: 'StrongPass123!'
  });

  assert.equal(result.success, false);
});

test('register deve rejeitar senha sem os requisitos mínimos', () => {
  const passwords = [
    'short',
    'lowercase123!',
    'UPPERCASE123!',
    'StrongPassword!',
    'StrongPass123'
  ];

  for (const password of passwords) {
    const result = registerSchema.safeParse({
      email: 'victor@example.com',
      password
    });

    assert.equal(result.success, false, `Senha aceita indevidamente: ${password}`);
  }
});

test('register deve rejeitar propriedades extras', () => {
  const result = registerSchema.safeParse({
    email: 'victor@example.com',
    password: 'StrongPass123!',
    role: 'admin'
  });

  assert.equal(result.success, false);
});

test('login deve aceitar credenciais válidas', () => {
  const result = loginSchema.safeParse({
    email: '  VICTOR@EXAMPLE.COM ',
    password: 'password123'
  });

  assert.equal(result.success, true);
  assert.equal(result.data.email, 'victor@example.com');
});

test('login deve rejeitar senha vazia', () => {
  const result = loginSchema.safeParse({
    email: 'victor@example.com',
    password: ''
  });

  assert.equal(result.success, false);
});

test('updateProfile deve aceitar e-mail válido', () => {
  const result = updateProfileSchema.safeParse({
    email: '  NEW@EXAMPLE.COM '
  });

  assert.equal(result.success, true);
  assert.equal(result.data.email, 'new@example.com');
});

test('updateProfile deve rejeitar propriedades extras', () => {
  const result = updateProfileSchema.safeParse({
    email: 'victor@example.com',
    role: 'admin'
  });

  assert.equal(result.success, false);
});
