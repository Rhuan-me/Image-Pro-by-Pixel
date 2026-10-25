const amqp = require('amqplib');
const fs = require('node:fs/promises');
const path = require('node:path');
const { v4: uuidv4 } = require('uuid');
const { env } = require('./config/env');
const { classify } = require('./services/classifier');

let channel = null;

async function setupTopology(ch) {
    await ch.assertExchange(env.exchange, 'topic', { durable: true });
    await ch.assertExchange(env.dlx, 'direct', { durable: true });
    await ch.assertQueue(env.dlq, { durable: true });
    await ch.bindQueue(env.dlq, env.dlx, 'image.dead');

    // MESMOS argumentos do produtor, senão dá PRECONDITION_FAILED
    await ch.assertQueue(env.queue, {
        durable: true,
        arguments: {
            'x-dead-letter-exchange': env.dlx,
            'x-dead-letter-routing-key': 'image.dead'
        }
    });
    await ch.bindQueue(env.queue, env.exchange, env.routingKeyIn);

    // Fila de resultados: sem ela, ImageProcessed/ProcessingError seriam descartados
    await ch.assertQueue(env.resultsQueue, { durable: true });
    await ch.bindQueue(env.resultsQueue, env.exchange, 'image.processed');
    await ch.bindQueue(env.resultsQueue, env.exchange, 'image.failed');
}

function publishEvent(routingKey, eventType, data, correlationId) {
    const eventId = uuidv4();
    const payload = { eventId, eventType, timestamp: new Date().toISOString(), data };
    channel.publish(env.exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
        persistent: true,
        contentType: 'application/json',
        messageId: eventId,
        correlationId: correlationId || eventId
    });
    return payload;
}

async function handleMessage(msg) {
    const correlationId = msg.properties.correlationId;
    const retryCount = msg.properties.headers?.['x-death']?.[0]?.count || 0;

    let event;
    try {
        event = JSON.parse(msg.content.toString());
    } catch {
        console.error('[Worker] Mensagem inválida (não é JSON). Enviando para a DLQ.');
        return channel.nack(msg, false, false);
    }

    const { imageId, userId, filePath, originalName } = event.data || {};
    console.log(`[Worker] Recebido ${event.eventId} (imagem ${imageId})`);

    try {
        const started = Date.now();
        const buffer = await fs.readFile(filePath);
        const ai = await classify(buffer, { originalName });

        const { dir, name, ext } = path.posix.parse(filePath);
        const outDir = dir.replace(env.rawBasePath, env.processedBasePath);
        const processedFilePath = path.posix.join(outDir, `${name}_out${ext}`);
        await fs.mkdir(outDir, { recursive: true });
        await fs.writeFile(processedFilePath, buffer); // MVP: cópia (ver limitação na doc)

        publishEvent('image.processed', 'ImageProcessed', {
            imageId, userId, processedFilePath,
            aiMetadata: { modelUsed: ai.modelUsed, confidence: ai.confidence, tags: ai.tags }
        }, correlationId);

        channel.ack(msg); // só confirma DEPOIS de concluir
        console.log(`[Worker] OK ${imageId} em ${Date.now() - started}ms`);
    } catch (err) {
        const errorCode = err.code === 'ENOENT' ? 'FILE_NOT_FOUND' : (err.code || 'AI_PROCESSING_ERROR');
        console.error(`[Worker] ERRO ${imageId}: [${errorCode}] ${err.message}`);
        try {
            publishEvent('image.failed', 'ProcessingError', {
                imageId, userId, errorCode, errorMessage: err.message, retryCount
            }, correlationId);
        } catch (pubErr) {
            console.error('[Worker] Falha ao publicar ProcessingError:', pubErr.message);
        }
        channel.nack(msg, false, false); // vai para a image-dlq via DLX
    }
}

async function start() {
    try {
        const connection = await amqp.connect(env.rabbitmqUrl);
        connection.on('error', (e) => console.error('[Worker] Erro na conexão:', e.message));
        connection.on('close', () => {
            console.warn('[Worker] Conexão fechada. Reconectando em 3s...');
            channel = null;
            setTimeout(start, 3000);
        });

        channel = await connection.createChannel();
        await setupTopology(channel);
        await channel.prefetch(env.prefetch);
        await channel.consume(env.queue, handleMessage, { noAck: false });
        console.log(`[Worker] Aguardando mensagens em '${env.queue}' (modo ${env.aiMode}).`);
    } catch (err) {
        console.error('[Worker] Falha ao iniciar:', err.message, '- nova tentativa em 3s');
        setTimeout(start, 3000);
    }
}

start();