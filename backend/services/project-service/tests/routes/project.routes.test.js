const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../../src/routes/project.routes');

test('project routes are defined on router', () => {
  assert.ok(router);
  assert.equal(typeof router, 'function');
  const routes = router.stack.map(layer => ({
    path: layer.route?.path,
    methods: layer.route ? Object.keys(layer.route.methods) : []
  }));
  assert.ok(routes.some(r => r.path === '/' && r.methods.includes('post')));
  assert.ok(routes.some(r => r.path === '/' && r.methods.includes('get')));
  assert.ok(routes.some(r => r.path === '/:id' && r.methods.includes('get')));
  assert.ok(routes.some(r => r.path === '/:id' && r.methods.includes('delete')));
});
