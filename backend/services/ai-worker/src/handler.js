const fs = require('node:fs/promises');
const path = require('node:path');
const imageProcessor = require('./services/imageProcessor');
const workerStorageService = require('./services/storage');

const TRANSIENT_FS = new Set(['EBUSY', 'EMFILE', 'ENFILE', 'EAGAIN', 'ETIMEDOUT', 'EIO']);

const fail = (code, message, retryable = false) =>
    Object.assign(new Error(message), { code, retryable });

function mapFsError(err) {
    if (err.code === 'ENOENT') return fail('FILE_NOT_FOUND', err.message);
    if (TRANSIENT_FS.has(err.code)) return fail('STORAGE_UNAVAILABLE', err.message, true);
    return err;
}

/** Valida o contrato do evento (ImageUploaded ou ImageProcessRequested) antes de qualquer processamento. */
function validateEvent(event, config) {
    if (!event || typeof event !== 'object') throw fail('INVALID_EVENT', 'Evento vazio ou malformado.');
    if (typeof event.eventId !== 'string') throw fail('INVALID_EVENT', 'Campo obrigatório ausente: eventId');
    
    const validEventTypes = ['ImageUploaded', 'ImageProcessRequested'];
    if (!validEventTypes.includes(event.eventType)) {
        throw fail('INVALID_EVENT', `eventType inesperado: ${event.eventType}`);
    }

    const data = event.data || {};
    for (const field of ['imageId', 'userId', 'filePath']) {
        if (typeof data[field] !== 'string' || data[field].trim() === '') {
            throw fail('INVALID_EVENT', `Campo obrigatório ausente: data.${field}`);
        }
    }

    const rawBase = path.resolve(config.rawBasePath);
    const resolvedPath = path.resolve(data.filePath);
    if (!resolvedPath.startsWith(rawBase + path.sep)) {
        throw fail('INVALID_EVENT', 'filePath fora do diretório permitido.');
    }
    return { ...data, resolvedPath };
}

/**
 * Processa a imagem aplicando efeito visual via Sharp de forma idempotente e com persistência no MinIO.
 */
async function processImage(data, { config, classify, attempt }) {
    const rawBase = path.resolve(config.rawBasePath);
    const relDir = path.relative(rawBase, path.dirname(data.resolvedPath));
    const { name, ext } = path.parse(data.resolvedPath);
    const outDir = path.join(path.resolve(config.processedBasePath), relDir);
    const outFile = path.join(outDir, `${name}_out${ext}`);
    const doneFile = path.join(outDir, `${name}_out.json`);

    try {
        const done = JSON.parse(await fs.readFile(doneFile, 'utf8'));
        return { ...done, reused: true };
    } catch {
        // ainda não processada
    }

    let stat;
    try {
        stat = await fs.stat(data.resolvedPath);
    } catch (err) {
        throw mapFsError(err);
    }
    if (!stat.isFile()) throw fail('INVALID_FILE', 'filePath não aponta para um arquivo.');
    if (stat.size > config.maxFileBytes) throw fail('FILE_TOO_LARGE', `Arquivo excede ${config.maxFileBytes} bytes.`);

    // 1. Inferência/Classificação IA
    const ai = await classify(data.resolvedPath, { originalName: data.originalName, attempt });

    // 2. Processamento Local com Sharp (efeito visual aplicado em milissegundos)
    const effectResult = await imageProcessor.applyVisualEffect(data.resolvedPath);

    try {
        await fs.mkdir(outDir, { recursive: true });
        // Gravação local atômica via tmp + rename
        await fs.writeFile(`${outFile}.tmp`, effectResult.buffer);
        await fs.rename(`${outFile}.tmp`, outFile);

        // 3. Persistência da imagem resultante no MinIO Storage local (pixpro-storage)
        const processedS3Key = `processed/${data.userId}/${name}_out${ext}`;
        const contentType = effectResult.format ? `image/${effectResult.format}` : 'image/jpeg';
        const storageResult = await workerStorageService.uploadProcessedImage({
            buffer: effectResult.buffer,
            key: processedS3Key,
            contentType
        });

        const result = {
            imageId: data.imageId,
            userId: data.userId,
            processedFilePath: outFile,
            processedStorageUrl: storageResult.url,
            url: storageResult.url,
            s3Key: processedS3Key,
            bucket: storageResult.bucket,
            aiMetadata: {
                modelUsed: ai.modelUsed,
                confidence: ai.confidence,
                tags: ai.tags,
                effectApplied: effectResult.effectApplied
            }
        };

        await fs.writeFile(`${doneFile}.tmp`, JSON.stringify(result));
        await fs.rename(`${doneFile}.tmp`, doneFile);
        return result;
    } catch (err) {
        throw mapFsError(err);
    }
}

/**
 * Cria o tratador de mensagens. Devolve a DECISÃO: 'ack' | 'dead-letter' | 'requeue'.
 * Quem aplica a decisão (ack/nack) é o worker.js.
 */
function createHandler({ config, classify, publishEvent, publishRetry }) {
    return async function handle(msg) {
        const correlationId = msg.properties?.correlationId;
        const attempt = Number(msg.properties?.headers?.['x-retry-count'] || 0);
        const started = Date.now();

        let event;
        try {
            event = JSON.parse(msg.content.toString());
        } catch {
            console.error('[Worker] Mensagem não é JSON. Enviando para a DLQ.');
            return 'dead-letter';
        }

        console.log(
            `[Worker] Recebido ${event?.eventId} (imagem ${event?.data?.imageId})` +
            `${msg.fields?.redelivered ? ' [REENTREGA]' : ''}${attempt > 0 ? ` [tentativa ${attempt}]` : ''}`
        );

        async function onFailure(err, eventData) {
            const code = err.code || 'AI_PROCESSING_ERROR';
            console.error(`[Worker] ERRO ${eventData?.imageId ?? '?'}: [${code}] ${err.message}`);

            // Falha temporária com tentativas sobrando: agenda nova tentativa (com confirmação do broker)
            if (err.retryable && attempt < config.maxRetries) {
                try {
                    await publishRetry(msg, attempt + 1);
                    console.log(`[Worker] Nova tentativa ${attempt + 1}/${config.maxRetries} agendada.`);
                    return 'ack';
                } catch (retryErr) {
                    console.error('[Worker] Não foi possível agendar o retry:', retryErr.message);
                    return 'requeue';
                }
            }

            // Falha definitiva: sem imageId não há como avisar ninguém
            if (typeof eventData?.imageId !== 'string') return 'dead-letter';

            // O ProcessingError precisa ser CONFIRMADO antes de descartar a original
            try {
                await publishEvent('image.failed', 'ProcessingError', {
                    imageId: eventData.imageId,
                    userId: eventData.userId,
                    errorCode: code,
                    errorMessage: err.message,
                    retryCount: attempt
                }, correlationId);
            } catch (pubErr) {
                console.error('[Worker] Falha ao publicar ProcessingError; a mensagem volta para a fila:', pubErr.message);
                return 'requeue';
            }
            return 'dead-letter';
        }

        let data;
        try {
            data = validateEvent(event, config);
        } catch (err) {
            return onFailure(err, event?.data);
        }

        try {
            const { reused, ...result } = await processImage(data, { config, classify, attempt });
            await publishEvent('image.processed', 'ImageProcessed', result, correlationId);
            console.log(
                `[Worker] OK ${data.imageId} em ${Date.now() - started}ms${reused ? ' (já processada; evento reenviado)' : ''}`
            );
            return 'ack';
        } catch (err) {
            return onFailure(err, data);
        }
    };
}

module.exports = { createHandler, validateEvent };
