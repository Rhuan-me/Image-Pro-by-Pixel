const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createHandler } = require('../src/handler');
const workerStorageService = require('../src/services/storage');

workerStorageService.client.send = async () => ({ ETag: 'mock-etag' });

const VALID_IMAGE_BUFFER = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
);

async function setup(overrides = {}) {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'pixpro-'));
    const raw = path.join(base, 'raw');
    await fs.mkdir(path.join(raw, 'u1'), { recursive: true });
    const filePath = path.join(raw, 'u1', 'img_1.jpg');
    await fs.writeFile(filePath, VALID_IMAGE_BUFFER);

    const published = [];
    const retried = [];
    let classifyCalls = 0;

    const handler = createHandler({
        config: { rawBasePath: raw, processedBasePath: path.join(base, 'processed'), maxRetries: 2, maxFileBytes: 1024 * 1024 },
        classify: overrides.classify || (async () => {
            classifyCalls += 1;
            return { modelUsed: 'fake', confidence: 0.9, tags: ['a'] };
        }),
        publishEvent: overrides.publishEvent || (async (routingKey, type, data) => { published.push({ routingKey, type, data }); }),
        publishRetry: overrides.publishRetry || (async (msg, n) => { retried.push(n); })
    });

    const validData = { imageId: 'img_1', userId: 'u1', filePath, originalName: 'foto.jpg' };
    return { handler, raw, filePath, validData, published, retried, calls: () => classifyCalls };
}

function makeMsg(data, headers = {}) {
    const event = { eventId: 'e1', eventType: 'ImageUploaded', timestamp: new Date().toISOString(), data };
    return {
        content: Buffer.from(JSON.stringify(event)),
        properties: { correlationId: 'c1', headers },
        fields: { redelivered: false }
    };
}

test('sucesso: processa via Sharp, publica ImageProcessed com MinIO URL e confirma', async () => {
    const { handler, validData, published } = await setup();
    assert.equal(await handler(makeMsg(validData)), 'ack');
    assert.equal(published[0].type, 'ImageProcessed');
    await fs.access(published[0].data.processedFilePath);
    assert.ok(published[0].data.processedStorageUrl.includes('/pixpro-storage/processed/u1/'));
    assert.equal(published[0].data.aiMetadata.effectApplied, 'grayscale+sharpen');
});

test('idempotência: mesma mensagem duas vezes não reprocessa', async () => {
    const { handler, validData, published, calls } = await setup();
    assert.equal(await handler(makeMsg(validData)), 'ack');
    assert.equal(await handler(makeMsg(validData)), 'ack');
    assert.equal(calls(), 1);
    assert.equal(published.length, 2);
    assert.equal(published[1].type, 'ImageProcessed');
});

test('imagem corrompida: captura exceção com segurança marcando como FAILED/dead-letter sem derrubar worker', async () => {
    const { handler, raw, validData, published } = await setup();
    const corruptPath = path.join(raw, 'u1', 'corrupt.jpg');
    await fs.writeFile(corruptPath, 'conteudo corrompido que nao e imagem');
    const corruptMsg = makeMsg({ ...validData, filePath: corruptPath });
    assert.equal(await handler(corruptMsg), 'dead-letter');
    assert.equal(published[0].type, 'ProcessingError');
    assert.equal(published[0].data.errorCode, 'IMAGE_CORRUPTED');
});

test('evento sem imageId vai para a DLQ sem publicar nada', async () => {
    const { handler, published } = await setup();
    assert.equal(await handler(makeMsg({})), 'dead-letter');
    assert.equal(published.length, 0);
});

test('evento sem filePath publica ProcessingError INVALID_EVENT', async () => {
    const { handler, published } = await setup();
    assert.equal(await handler(makeMsg({ imageId: 'img_1', userId: 'u1' })), 'dead-letter');
    assert.equal(published[0].type, 'ProcessingError');
    assert.equal(published[0].data.errorCode, 'INVALID_EVENT');
});

test('filePath fora do diretório permitido é rejeitado', async () => {
    const { handler, raw, validData, published } = await setup();
    const data = { ...validData, filePath: path.join(raw, '..', 'segredo.txt') };
    assert.equal(await handler(makeMsg(data)), 'dead-letter');
    assert.equal(published[0].data.errorCode, 'INVALID_EVENT');
});

test('arquivo inexistente é falha definitiva (sem retry)', async () => {
    const { handler, raw, validData, published, retried } = await setup();
    const data = { ...validData, filePath: path.join(raw, 'u1', 'nao_existe.jpg') };
    assert.equal(await handler(makeMsg(data)), 'dead-letter');
    assert.equal(published[0].data.errorCode, 'FILE_NOT_FOUND');
    assert.equal(published[0].data.retryCount, 0);
    assert.equal(retried.length, 0);
});

test('falha temporária com tentativas sobrando agenda retry', async () => {
    const { handler, validData, published, retried } = await setup({
        classify: async () => { throw Object.assign(new Error('temporário'), { code: 'TEMP', retryable: true }); }
    });
    assert.equal(await handler(makeMsg(validData)), 'ack');
    assert.deepEqual(retried, [1]);
    assert.equal(published.length, 0);
});

test('falha temporária com tentativas esgotadas vai para a DLQ com retryCount', async () => {
    const { handler, validData, published, retried } = await setup({
        classify: async () => { throw Object.assign(new Error('temporário'), { code: 'TEMP', retryable: true }); }
    });
    assert.equal(await handler(makeMsg(validData, { 'x-retry-count': 2 })), 'dead-letter');
    assert.equal(published[0].type, 'ProcessingError');
    assert.equal(published[0].data.retryCount, 2);
    assert.equal(retried.length, 0);
});

test('se o ProcessingError não for confirmado, a mensagem volta para a fila', async () => {
    const { handler, validData } = await setup({
        classify: async () => { throw Object.assign(new Error('definitivo'), { code: 'AI_ERR', retryable: false }); },
        publishEvent: async () => { throw new Error('broker fora'); }
    });
    assert.equal(await handler(makeMsg(validData)), 'requeue');
});

test('se a publicação do ImageProcessed falhar, agenda retry em vez de perder', async () => {
    const { handler, validData, retried } = await setup({
        publishEvent: async () => { throw Object.assign(new Error('broker fora'), { retryable: true }); }
    });
    assert.equal(await handler(makeMsg(validData)), 'ack');
    assert.deepEqual(retried, [1]);
});
