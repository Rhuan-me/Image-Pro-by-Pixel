const test = require('node:test');
const assert = require('node:assert/strict');
const Project = require('../../src/models/Project');

test('Project Model - deve ter os atributos e nome de tabela corretos', () => {
  assert.equal(Project.tableName, 'projects');
  assert.ok(Project.rawAttributes.id);
  assert.ok(Project.rawAttributes.userId);
  assert.equal(Project.rawAttributes.userId.field, 'user_id');
  assert.ok(Project.rawAttributes.name);
  assert.ok(Project.rawAttributes.description);
});