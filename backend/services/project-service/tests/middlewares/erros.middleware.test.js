const test = require('node:test');
const assert = require('node:assert/strict');
const errorHandler = require('../../src/middlewares/erros.middleware');

test('errorHandler passes through when headersSent is true', () => {
  let nextError = null;
  errorHandler(new Error('err'), {}, { headersSent: true }, (e) => { nextError = e; });
  assert.ok(nextError);
});

test('errorHandler handles entity.too.large', () => {
  let status = null;
  let json = null;
  const res = {
    headersSent: false,
    status(s) { status = s; return this; },
    json(j) { json = j; return this; }
  };
  const err = new Error('too big');
  err.type = 'entity.too.large';
  errorHandler(err, { correlationId: 'cid-project' }, res, () => {});
  assert.equal(status, 413);
  assert.equal(json.error.code, 'PAYLOAD_TOO_LARGE');
  assert.equal(json.correlationId, 'cid-project');
});

test('errorHandler handles 500 error with masked message', () => {
  let status = null;
  let json = null;
  const res = {
    headersSent: false,
    status(s) { status = s; return this; },
    json(j) { json = j; return this; }
  };
  const err = new Error('database failed');
  errorHandler(err, {}, res, () => {});
  assert.equal(status, 500);
  assert.equal(json.error.code, 'INTERNAL_SERVER_ERROR');
  assert.equal(json.error.message, 'Ocorreu um erro interno no servidor.');
});

test('errorHandler handles status < 500 with custom code and message', () => {
  let status = null;
  let json = null;
  const res = {
    headersSent: false,
    status(s) { status = s; return this; },
    json(j) { json = j; return this; }
  };
  const err = new Error('bad input');
  err.status = 400;
  err.code = 'BAD_INPUT';
  errorHandler(err, {}, res, () => {});
  assert.equal(status, 400);
  assert.equal(json.error.code, 'BAD_INPUT');
  assert.equal(json.error.message, 'bad input');
});
