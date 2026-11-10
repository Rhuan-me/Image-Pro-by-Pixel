const test = require('node:test');
const assert = require('node:assert');

test('Sequelize instance is properly configured', () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/db';
  const sequelize = require('../../src/config/database');
  assert.ok(sequelize);
  assert.strictEqual(sequelize.getDialect(), 'postgres');
});