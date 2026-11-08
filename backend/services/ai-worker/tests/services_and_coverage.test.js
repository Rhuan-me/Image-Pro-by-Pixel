const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { classify } = require('../src/services/classifier');
const imageProcessor = require('../src/services/imageProcessor');
const workerStorageService = require('../src/services/storage');
const { createHandler } = require('../src/handler');
const { env } = require('../src/config/env');

const VALID_IMAGE_BUFFER = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
);

test('classifier handles simulate mode with normal, error, and temp inputs', async () => {
    const origDelay = env.simulateDelayMs;
    env.simulateDelayMs = 0;

    try {
        // Normal input
        const res = await classify('/path/img.jpg', { originalName: 'normal.jpg', attempt: 0 });
        assert.equal(res.modelUsed, 'simulated-v0');
        assert.equal(res.confidence, 0.98);

        // Erro input (definitive failure)
        await assert.rejects(
            () => classify('/path/img.jpg', { originalName: 'test_erro.jpg', attempt: 0 }),
            (err) => {
                assert.equal(err.code, 'AI_INFERENCE_ERROR');
                assert.equal(err.retryable, false);
                return true;
            }
        );

        // Temp input with attempt < 2 (transient failure)
        await assert.rejects(
            () => classify('/path/img.jpg', { originalName: 'test_temp.jpg', attempt: 1 }),
            (err) => {
                assert.equal(err.code, 'SIMULATED_TRANSIENT');
                assert.equal(err.retryable, true);
                return true;
            }
        );

        // Temp input with attempt >= 2 (succeeds)
        const resTemp = await classify('/path/img.jpg', { originalName: 'test_temp.jpg', attempt: 2 });
        assert.equal(resTemp.modelUsed, 'simulated-v0');

        // Unsupported AI_MODE
        const origMode = env.aiMode;
        try {
            env.aiMode = 'mobilenet';
            await assert.rejects(
                () => classify('/path/img.jpg', { originalName: 'normal.jpg' }),
                (err) => {
                    assert.equal(err.code, 'AI_MODE_UNSUPPORTED');
                    return true;
                }
            );
        } finally {
            env.aiMode = origMode;
        }
    } finally {
        env.simulateDelayMs = origDelay;
    }
});

test('imageProcessor applies resize option and handles corrupted input', async () => {
    // With resize
    const res = await imageProcessor.applyVisualEffect(VALID_IMAGE_BUFFER, {
        resize: { width: 10, height: 10 }
    });
    assert.ok(res.buffer);
    assert.equal(res.format, 'png');
    assert.equal(res.effectApplied, 'grayscale+sharpen');

    // Corrupted input
    await assert.rejects(
        () => imageProcessor.applyVisualEffect(Buffer.from('not an image')),
        (err) => {
            assert.equal(err.code, 'IMAGE_CORRUPTED');
            assert.equal(err.retryable, false);
            return true;
        }
    );
});

test('workerStorageService uploadProcessedImage and downloadImage handle S3 responses', async () => {
    const origSend = workerStorageService.client.send;

    try {
        // upload success
        workerStorageService.client.send = async () => ({ ETag: 'etag-1' });
        const uploadRes = await workerStorageService.uploadProcessedImage({
            buffer: Buffer.from('data'),
            key: 'processed/img.jpg'
        });
        assert.ok(uploadRes.url.includes('processed/img.jpg'));

        // download success
        async function* genStream() {
            yield Buffer.from('image-');
            yield Buffer.from('data');
        }
        workerStorageService.client.send = async () => ({ Body: genStream() });
        const downloadedBuffer = await workerStorageService.downloadImage({ key: 'processed/img.jpg' });
        assert.equal(downloadedBuffer.toString(), 'image-data');

        // download error returns null
        workerStorageService.client.send = async () => { throw new Error('s3 unavailable'); };
        const nullBuffer = await workerStorageService.downloadImage({ key: 'nonexistent.jpg' });
        assert.equal(nullBuffer, null);
    } finally {
        workerStorageService.client.send = origSend;
    }
});

test('handler handles non-JSON messages, invalid event types, and retry publishing failures', async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'pixpro-handler-'));
    const raw = path.join(base, 'raw');
    await fs.mkdir(path.join(raw, 'u1'), { recursive: true });
    const filePath = path.join(raw, 'u1', 'test.jpg');
    await fs.writeFile(filePath, VALID_IMAGE_BUFFER);

    // 1. Non-JSON message -> dead-letter
    const handler1 = createHandler({
        config: { rawBasePath: raw, processedBasePath: path.join(base, 'p'), maxRetries: 2, maxFileBytes: 1024 * 1024 },
        classify: async () => ({}),
        publishEvent: async () => {},
        publishRetry: async () => {}
    });
    const nonJsonMsg = { content: Buffer.from('invalid-json') };
    assert.equal(await handler1(nonJsonMsg), 'dead-letter');

    // 2. Invalid eventType -> dead-letter
    const invalidTypeMsg = {
        content: Buffer.from(JSON.stringify({
            eventId: 'e-bad',
            eventType: 'UnknownType',
            data: { imageId: 'img_1', userId: 'u1', filePath }
        })),
        properties: { correlationId: 'c1' }
    };
    assert.equal(await handler1(invalidTypeMsg), 'dead-letter');

    // 3. Retry failure -> requeue
    const handlerRetryFail = createHandler({
        config: { rawBasePath: raw, processedBasePath: path.join(base, 'p'), maxRetries: 2, maxFileBytes: 1024 * 1024 },
        classify: async () => {
            const err = new Error('transient broker error');
            err.retryable = true;
            throw err;
        },
        publishEvent: async () => {},
        publishRetry: async () => { throw new Error('publish retry connection lost'); }
    });
    const retryMsg = {
        content: Buffer.from(JSON.stringify({
            eventId: 'e-retry',
            eventType: 'ImageUploaded',
            data: { imageId: 'img_retry', userId: 'u1', filePath, originalName: 'test.jpg' }
        })),
        properties: { correlationId: 'c2', headers: { 'x-retry-count': 0 } }
    };
    assert.equal(await handlerRetryFail(retryMsg), 'requeue');
});
