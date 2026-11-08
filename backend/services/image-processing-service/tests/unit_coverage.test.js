const test = require('node:test');
const assert = require('node:assert/strict');
const rabbitmq = require('../src/config/rabbitmq');
const database = require('../src/config/database');
const { publishImageStatusChanged } = require('../src/events/imageStatusChanged');
const { notFoundHandler, globalErrorHandler } = require('../src/middlewares/errorHandler');
const imageController = require('../src/controllers/imageController');
const eventPublisher = require('../src/services/eventPublisherService');
const storageService = require('../src/services/storage.service');
const healthRoutes = require('../src/routes/healthRoutes');
const handlers = require('../src/handlers');

test('publishImageStatusChanged publishes event with all options and defaults', async () => {
  const origPublish = rabbitmq.publishEvent;
  const published = [];
  rabbitmq.publishEvent = async (queue, payload, opts) => {
    published.push({ queue, payload, opts });
  };

  try {
    const res1 = await publishImageStatusChanged({
      imageId: 'img-101',
      status: 'PROCESSED',
      processedStorageUrl: 'http://cdn/101.jpg',
      correlationId: 'cid-custom'
    });
    assert.equal(res1.data.processedStorageUrl, 'http://cdn/101.jpg');
    assert.equal(published[0].opts.correlationId, 'cid-custom');

    const res2 = await publishImageStatusChanged({
      imageId: 'img-102',
      status: 'FAILED'
    });
    assert.equal(res2.data.processedStorageUrl, null);
    assert.equal(published[1].opts.correlationId, res2.eventId);
  } finally {
    rabbitmq.publishEvent = origPublish;
  }
});

test('notFoundHandler returns 404 json', () => {
  let statusCode = null;
  let body = null;
  const res = {
    status(s) { statusCode = s; return this; },
    json(b) { body = b; return this; }
  };
  notFoundHandler({ method: 'GET', originalUrl: '/api/unknown' }, res);
  assert.equal(statusCode, 404);
  assert.equal(body.error, 'NOT_FOUND');
});

test('globalErrorHandler handles various error branches', () => {
  let statusCode = null;
  let body = null;
  const res = {
    status(s) { statusCode = s; return this; },
    json(b) { body = b; return this; }
  };

  const multerErr = new Error('Field unexpected');
  multerErr.name = 'MulterError';
  multerErr.code = 'LIMIT_UNEXPECTED_FILE';
  globalErrorHandler(multerErr, { correlationId: 'cid-m' }, res);
  assert.equal(statusCode, 400);
  assert.equal(body.error, 'UPLOAD_ERROR');
  assert.equal(body.correlationId, 'cid-m');

  const errNoMsg = {};
  globalErrorHandler(errNoMsg, null, res);
  assert.equal(statusCode, 500);
  assert.equal(body.message, 'Ocorreu um erro interno no servidor.');
  assert.equal(body.correlationId, undefined);
});

test('imageController error paths call next(error)', async () => {
  const origUpload = handlers.uploadImage;
  const origGet = handlers.getImageStatus;

  try {
    handlers.uploadImage = async () => { throw new Error('upload failed'); };
    let uploadNextErr = null;
    await imageController.upload({ body: {}, file: null }, {}, (err) => { uploadNextErr = err; });
    assert.ok(uploadNextErr);

    handlers.getImageStatus = async () => { throw new Error('get failed'); };
    let getNextErr = null;
    await imageController.getById({ params: { id: 'img-1' } }, {}, (err) => { getNextErr = err; });
    assert.ok(getNextErr);
  } finally {
    handlers.uploadImage = origUpload;
    handlers.getImageStatus = origGet;
  }
});

test('startResultsConsumer handles channel absence and processes messages', async () => {
  const origGetChannel = rabbitmq.getChannel;

  try {
    rabbitmq.getChannel = () => null;
    delete require.cache[require.resolve('../src/consumers/resultsConsumer')];
    let { startResultsConsumer } = require('../src/consumers/resultsConsumer');
    const ok = await startResultsConsumer();
    assert.equal(ok, false);

    let consumerCallback = null;
    let acked = [];
    const mockChannel = {
      assertExchange: async () => {},
      assertQueue: async () => {},
      bindQueue: async () => {},
      prefetch: async () => {},
      consume: async (queue, cb) => { consumerCallback = cb; },
      ack: (msg) => { acked.push(msg); },
      nack: () => {}
    };
    rabbitmq.getChannel = () => mockChannel;
    delete require.cache[require.resolve('../src/consumers/resultsConsumer')];
    startResultsConsumer = require('../src/consumers/resultsConsumer').startResultsConsumer;

    const started = await startResultsConsumer();
    assert.equal(started, true);
    assert.ok(consumerCallback);

    await consumerCallback(null);

    const invalidJsonMsg = { content: Buffer.from('not json') };
    await consumerCallback(invalidJsonMsg);
    assert.ok(acked.includes(invalidJsonMsg));

    const origProcess = handlers.processImage;
    handlers.processImage = async () => ({ applied: true, status: 'PROCESSED' });
    const validMsg = {
      content: Buffer.from(JSON.stringify({
        eventType: 'ImageProcessed',
        data: { imageId: 'img-1', processedStorageUrl: 'http://foo' }
      })),
      properties: { correlationId: 'cid-proc' }
    };
    await consumerCallback(validMsg);
    assert.ok(acked.includes(validMsg));

    handlers.processImage = async () => ({ applied: false });
    const unappliedMsg = {
      content: Buffer.from(JSON.stringify({
        eventType: 'UnknownEvent',
        data: { imageId: 'img-2' }
      }))
    };
    await consumerCallback(unappliedMsg);
    assert.ok(acked.includes(unappliedMsg));

    handlers.processImage = async () => { throw new Error('db lock'); };
    const errorMsg = {
      content: Buffer.from(JSON.stringify({ eventType: 'ImageProcessed', data: { imageId: 'img-3' } }))
    };
    await consumerCallback(errorMsg);

    handlers.processImage = origProcess;
  } finally {
    rabbitmq.getChannel = origGetChannel;
  }
});

test('eventPublisherService publishes with fallback fields', async () => {
  const origPublish = rabbitmq.publishEvent;
  let publishedData = null;
  rabbitmq.publishEvent = async (key, payload, opts) => {
    publishedData = { key, payload, opts };
  };

  try {
    const payload = await eventPublisher.publishImageUploaded({
      imageRecord: {
        id: 'img-fallback',
        userId: 'usr-1',
        filePath: '/uploads/img.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        url: 'http://cdn/test.jpg'
      }
    });
    assert.equal(payload.data.s3Key, null);
    assert.equal(payload.data.storageUrl, 'http://cdn/test.jpg');
    assert.equal(publishedData.opts.correlationId, payload.eventId);
  } finally {
    rabbitmq.publishEvent = origPublish;
  }
});

test('storageService uploadFile and getFile handle success and streams', async () => {
  const origSend = storageService.client.send;

  try {
    // uploadFile success
    storageService.client.send = async () => ({ ETag: '"custom-etag"' });
    const uploadRes = await storageService.uploadFile({
      buffer: Buffer.from('abc'),
      key: 'test/img.jpg'
    });
    assert.equal(uploadRes.etag, '"custom-etag"');

    // getFile success
    async function* genChunks() {
      yield Buffer.from('chunk1');
      yield Buffer.from('chunk2');
    }
    storageService.client.send = async () => ({
      Body: genChunks(),
      ContentType: 'image/jpeg',
      ContentLength: 12
    });
    const getRes = await storageService.getFile({ key: 'test/img.jpg' });
    assert.equal(getRes.buffer.toString(), 'chunk1chunk2');
    assert.equal(getRes.contentType, 'image/jpeg');

    // uploadFile error without fallback
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    storageService.client.send = async () => {
      const e = new Error('s3 fatal');
      e.code = 'SOME_ERROR';
      throw e;
    };
    await assert.rejects(() => storageService.uploadFile({ buffer: Buffer.from('a'), key: 'k' }), /s3 fatal/);
    process.env.NODE_ENV = origEnv;
  } finally {
    storageService.client.send = origSend;
  }
});

test('imageStorageService getExtension handles various mimetypes and filenames', () => {
  const imageStorageService = require('../src/services/imageStorageService');
  assert.equal(imageStorageService.getExtension('', 'image/jpeg'), '.jpg');
  assert.equal(imageStorageService.getExtension('', 'image/png'), '.png');
  assert.equal(imageStorageService.getExtension('', 'image/webp'), '.webp');
  assert.equal(imageStorageService.getExtension('', 'image/gif'), '.gif');
  assert.equal(imageStorageService.getExtension('', 'application/octet-stream'), '.img');
  assert.equal(imageStorageService.getExtension('photo.bmp', 'image/bmp'), '.bmp');
});

test('healthRoutes covers connected dependencies', () => {
  const origIsRabbit = rabbitmq.isRabbitMQConnected;
  const origIsDb = database.isDatabaseConnected;

  try {
    rabbitmq.isRabbitMQConnected = () => true;
    database.isDatabaseConnected = () => true;

    delete require.cache[require.resolve('../src/routes/healthRoutes')];
    const freshHealthRoutes = require('../src/routes/healthRoutes');

    let resBody = null;
    const req = {};
    const res = {
      status(s) { return this; },
      json(b) { resBody = b; return this; }
    };

    const healthLayer = freshHealthRoutes.stack.find(l => l.route?.path === '/health');
    healthLayer.route.stack[0].handle(req, res);

    assert.equal(resBody.dependencies.rabbitmq, 'CONNECTED');
    assert.equal(resBody.dependencies.database, 'CONNECTED');
  } finally {
    rabbitmq.isRabbitMQConnected = origIsRabbit;
    database.isDatabaseConnected = origIsDb;
  }
});
