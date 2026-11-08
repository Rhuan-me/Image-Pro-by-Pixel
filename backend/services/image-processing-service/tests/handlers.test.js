const { describe, it } = require('node:test');
const assert = require('node:assert');
const { UploadImageCommand } = require('../src/commands/uploadImage.command');
const { ProcessImageCommand } = require('../src/commands/processImage.command');
const { GetImageStatusQuery } = require('../src/queries/getImageStatus.query');
const { createUploadImageHandler } = require('../src/handlers/uploadImage.handler');
const { createProcessImageHandler } = require('../src/handlers/processImage.handler');
const { createGetImageStatusHandler } = require('../src/handlers/getImageStatus.handler');

function fakeRepo(initial = {}) {
    const calls = { stored: [], updates: [] };
    return {
        calls,
        getExtension: (name) => (name.endsWith('.png') ? '.png' : '.jpg'),
        storeImage: async (data) => {
            calls.stored.push(data);
            return {
                id: data.imageId, userId: data.userId, originalName: data.originalName, mimeType: data.mimeType,
                status: 'PENDING', filePath: '/x', storageUrl: data.storageUrl, fileSize: 1, createdAt: 'agora'
            };
        },
        getImageById: async (id) => initial[id] || null,
        updateStatus: async (id, status, extra) => { calls.updates.push({ id, status, extra }); }
    };
}

function fakeStorage() {
    const storage = {
        uploads: [],
        uploadFile: async (args) => { storage.uploads.push(args); return { url: `http://s3/${args.key}` }; }
    };
    return storage;
}

const pngFile = { originalname: 'a.png', mimetype: 'image/png', buffer: Buffer.from('x'), size: 1 };

describe('UploadImageHandler', () => {
    it('com arquivo: envia ao storage, grava metadados e publica ImageUploaded', async () => {
        const storage = fakeStorage();
        const repo = fakeRepo();
        const published = [];
        const publisher = { publishImageUploaded: async (args) => { published.push(args); return { eventId: 'ev1' }; } };
        const handle = createUploadImageHandler({ storageService: storage, imageRepository: repo, eventPublisher: publisher, idGenerator: () => 'img_1' });

        const result = await handle(new UploadImageCommand({ userId: 'u1', file: pngFile, correlationId: 'c1' }));

        assert.strictEqual(storage.uploads[0].key, 'raw/u1/img_1.png');
        assert.strictEqual(repo.calls.stored[0].storageUrl, 'http://s3/raw/u1/img_1.png');
        assert.strictEqual(result.eventStatus, 'PUBLISHED');
        assert.strictEqual(result.eventId, 'ev1');
        assert.strictEqual(published[0].correlationId, 'c1');
    });

    it('sem arquivo (só metadados): não chama o storage', async () => {
        const storage = fakeStorage();
        const publisher = { publishImageUploaded: async () => ({ eventId: 'ev2' }) };
        const handle = createUploadImageHandler({ storageService: storage, imageRepository: fakeRepo(), eventPublisher: publisher, idGenerator: () => 'img_2' });

        const result = await handle(new UploadImageCommand({ userId: 'u1', originalName: 'avatar.png', mimeType: 'image/png' }));

        assert.strictEqual(storage.uploads.length, 0);
        assert.strictEqual(result.storageUrl, null);
        assert.strictEqual(result.imageRecord.id, 'img_2');
    });

    it('falha ao publicar o evento não derruba o comando', async () => {
        const repo = fakeRepo();
        const publisher = { publishImageUploaded: async () => { throw new Error('broker fora'); } };
        const handle = createUploadImageHandler({ storageService: fakeStorage(), imageRepository: repo, eventPublisher: publisher, idGenerator: () => 'img_3' });

        const result = await handle(new UploadImageCommand({ userId: 'u1', file: pngFile }));

        assert.strictEqual(result.eventStatus, 'BROKER_OFFLINE_PENDING_RETRY');
        assert.strictEqual(result.eventId, null);
        assert.strictEqual(repo.calls.stored.length, 1);
    });
});

describe('ProcessImageHandler', () => {
    it('ImageProcessed vira PROCESSED, guarda o resultado e publica ImageStatusChanged', async () => {
        const repo = fakeRepo();
        const changed = [];
        const handle = createProcessImageHandler({ imageRepository: repo, publishStatusChanged: async (e) => { changed.push(e); } });

        const result = await handle(new ProcessImageCommand({ imageId: 'img_1', eventType: 'ImageProcessed', processedFilePath: '/p/out.jpg', processedStorageUrl: 'http://s3/out.jpg' }));

        assert.deepStrictEqual(result, { applied: true, status: 'PROCESSED' });
        assert.strictEqual(repo.calls.updates[0].status, 'PROCESSED');
        assert.strictEqual(repo.calls.updates[0].extra.processedStorageUrl, 'http://s3/out.jpg');
        assert.strictEqual(changed[0].status, 'PROCESSED');
    });

    it('ProcessingError vira FAILED', async () => {
        const repo = fakeRepo();
        const handle = createProcessImageHandler({ imageRepository: repo, publishStatusChanged: async () => {} });

        const result = await handle(new ProcessImageCommand({ imageId: 'img_1', eventType: 'ProcessingError' }));

        assert.strictEqual(result.status, 'FAILED');
        assert.strictEqual(repo.calls.updates[0].status, 'FAILED');
    });

    it('evento desconhecido é ignorado sem tocar no banco', async () => {
        const repo = fakeRepo();
        const handle = createProcessImageHandler({ imageRepository: repo, publishStatusChanged: async () => {} });

        const result = await handle(new ProcessImageCommand({ imageId: 'img_1', eventType: 'Qualquer' }));

        assert.strictEqual(result.applied, false);
        assert.strictEqual(repo.calls.updates.length, 0);
    });

    it('erro do banco sobe (o consumidor devolve a mensagem à fila)', async () => {
        const repo = fakeRepo();
        repo.updateStatus = async () => { throw new Error('banco fora'); };
        const handle = createProcessImageHandler({ imageRepository: repo, publishStatusChanged: async () => {} });

        await assert.rejects(
            handle(new ProcessImageCommand({ imageId: 'img_1', eventType: 'ImageProcessed' })),
            /banco fora/
        );
    });

    it('falha ao publicar ImageStatusChanged não invalida o comando', async () => {
        const handle = createProcessImageHandler({
            imageRepository: fakeRepo(),
            publishStatusChanged: async () => { throw new Error('broker fora'); }
        });

        const result = await handle(new ProcessImageCommand({ imageId: 'img_1', eventType: 'ImageProcessed' }));

        assert.strictEqual(result.applied, true);
    });
});

describe('GetImageStatusHandler', () => {
    it('devolve os dados sem o buffer', async () => {
        const repo = fakeRepo({ img_1: { id: 'img_1', status: 'PENDING', buffer: Buffer.from('x') } });
        const handle = createGetImageStatusHandler({ imageRepository: repo });

        const result = await handle(new GetImageStatusQuery({ imageId: 'img_1' }));

        assert.strictEqual(result.status, 'PENDING');
        assert.strictEqual('buffer' in result, false);
    });

    it('devolve null quando a imagem não existe', async () => {
        const handle = createGetImageStatusHandler({ imageRepository: fakeRepo() });
        assert.strictEqual(await handle(new GetImageStatusQuery({ imageId: 'nao_existe' })), null);
    });
});