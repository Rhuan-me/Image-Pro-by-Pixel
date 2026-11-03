const test = require('node:test');
const assert = require('node:assert/strict');
const { createProjectSchema, updateProjectSchema } = require('../../src/schemas/project.schemas');

test('createProjectSchema - deve validar com sucesso um payload válido', () => {
  const result = createProjectSchema.safeParse({
    name: 'Meu Projeto',
    description: 'Descrição válida do projeto'
  });
  assert.equal(result.success, true);
});

test('createProjectSchema - deve falhar se o nome for muito curto', () => {
  const result = createProjectSchema.safeParse({
    name: 'A'
  });
  assert.equal(result.success, false);
});

test('createProjectSchema - deve rejeitar campos extras (strict)', () => {
  const result = createProjectSchema.safeParse({
    name: 'Meu Projeto',
    campoInvalido: 'não permitido'
  });
  assert.equal(result.success, false);
});