const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const { env } = require('./config/env');
const { classify } = require('./services/classifier');
const { createHandler } = require('./handler');

let connection = null;
let channel = null;
let consumerTag = null;
let shuttingDown = false;
let reconnecting = false;
let inFlight = 0;
const returned = new Set(); // messageIds devolvidos pelo broker (sem rota)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function setupTopology(ch) {
    await ch.assertExchange(env.exchange, 'topic', { durable: true });
    await ch.assertExchange(env.dlx, 'direct', { durable: true });
    await ch.assertQueue(env.dlq, { durable: true });
    await ch.bindQueue(env.dlq, env.dlx, 'image.dead');

    // MESMOS argumentos do produtor, senão dá PRECONDITION_FAILED
    await ch.assertQueue(env.queue, {
        durable: true,
        arguments: { 'x-dead-letter-exchange': env.dlx, 'x-dead-letter-routing-key': 'image.dead' }
    });
    await ch.bindQueue(env.queue, env.exchange, env.routingKeyIn);

    // Retry com delay: após o TTL a mensagem volta para a image-queue
    await ch.assertQueue(env.retryQueue, {
        durable: true,
        arguments: {
            'x-message-ttl': env.retryDelayMs,
            'x-dead-letter-exchange': env.exchange,
            'x-dead-letter-routing-key': env.routingKeyIn
        }
    });

    await ch.assertQueue(env.resultsQueue, { durable: true });
    await ch.bindQueue(env.resultsQueue, env.exchange, 'image.processed');
    await ch.bindQueue(env.resultsQueue, env.exchange, 'image.failed');
}

/** Publica e só resolve quando o broker CONFIRMA. Rejeita se der nack ou se não houver rota. */
function publishConfirmed(exchange, routingKey, content, options = {}) {
    return new Promise((resolve, reject) => {
        const ch = channel;
        if (!ch) {
            return reject(Object.assign(new Error('Canal RabbitMQ indisponível.'), { code: 'BROKER_UNAVAILABLE', retryable: true }));
        }
        const messageId = options.messageId || uuidv4();
        try {
            ch.publish(
                exchange,
                routingKey,
                content,
                { persistent: true, mandatory: true, contentType: 'application/json', ...options, messageId },
                (err) => {
                    if (err) return reject(Object.assign(err, { code: 'PUBLISH_NACKED', retryable: true }));
                    if (returned.delete(messageId)) {
                        return reject(Object.assign(
                            new Error(`Mensagem sem rota (exchange='${exchange}', key='${routingKey}').`),
                            { code: 'UNROUTABLE', retryable: true }
                        ));
                    }
                    resolve();
                }
            );
        } catch (err) {
            reject(Object.assign(err, { code: 'BROKER_UNAVAILABLE', retryable: true }));
        }
    });
}

function publishEvent(routingKey, eventType, data, correlationId) {
    const eventId = uuidv4();
    const payload = { eventId, eventType, timestamp: new Date().toISOString(), data };
    return publishConfirmed(env.exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
        messageId: eventId,
        correlationId: correlationId || eventId
    });
}

function publishRetry(msg, nextAttempt) {
    return publishConfirmed('', env.retryQueue, msg.content, {
        messageId: msg.properties.messageId,
        correlationId: msg.properties.correlationId,
        headers: { ...msg.properties.headers, 'x-retry-count': nextAttempt }
    });
}

const handler = createHandler({ config: env, classify, publishEvent, publishRetry });

async function onMessage(msg) {
    if (!msg) {
        console.warn('[Worker] Consumidor cancelado pelo broker. Reconectando...');
        connection?.close().catch(() => {});
        return;
    }

    inFlight += 1;
    let decision;
    try {
        decision = await handler(msg);
    } catch (err) {
        console.error('[Worker] Erro inesperado no tratamento:', err.message);
        // Uma segunda chance; se já foi reentregue, vai para a DLQ para não travar a fila
        decision = msg.fields.redelivered ? 'dead-letter' : 'requeue';
    }

    try {
        if (decision === 'ack') {
            channel.ack(msg);
        } else if (decision === 'dead-letter') {
            channel.nack(msg, false, false);
        } else {
            await sleep(env.requeueDelayMs); // evita laço rápido enquanto o problema persiste
            channel.nack(msg, false, true);
        }
    } catch (err) {
        console.warn('[Worker] Não foi possível confirmar a mensagem (canal fechado?). O broker vai reentregar:', err.message);
    } finally {
        inFlight -= 1;
    }
}

async function connect() {
    const conn = await amqp.connect(env.rabbitmqUrl);
    try {
        const ch = await conn.createConfirmChannel();
        ch.on('return', (m) => returned.add(m.properties.messageId));
        ch.on('error', (e) => console.error('[Worker] Erro no canal:', e.message));
        ch.on('close', () => {
            if (!shuttingDown) conn.close().catch(() => {}); // canal caiu: força reconexão completa
        });

        await setupTopology(ch);
        await ch.prefetch(env.prefetch);
        const { consumerTag: tag } = await ch.consume(env.queue, onMessage, { noAck: false });

        connection = conn;
        channel = ch;
        consumerTag = tag;
        conn.on('error', (e) => console.error('[Worker] Erro na conexão:', e.message));
        conn.once('close', () => {
            console.warn('[Worker] Conexão com o RabbitMQ perdida.');
            channel = null;
            connection = null;
            if (!shuttingDown) connectWithBackoff();
        });
    } catch (err) {
        await conn.close().catch(() => {});
        throw err;
    }
}

async function connectWithBackoff() {
    if (reconnecting) return;
    reconnecting = true;
    let tries = 0;
    while (!shuttingDown) {
        try {
            await connect();
            console.log(`[Worker] Aguardando mensagens em '${env.queue}' (modo ${env.aiMode}).`);
            break;
        } catch (err) {
            tries += 1;
            const delay = Math.min(30000, 1000 * 2 ** Math.min(tries, 5));
            console.error(`[Worker] Falha ao conectar (tentativa ${tries}): ${err.message}. Nova tentativa em ${delay / 1000}s.`);
            await sleep(delay);
        }
    }
    reconnecting = false;
}

async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[Worker] ${signal} recebido. Finalizando...`);
    try {
        if (channel && consumerTag) await channel.cancel(consumerTag);
    } catch { /* já fechado */ }
    const deadline = Date.now() + 10000;
    while (inFlight > 0 && Date.now() < deadline) await sleep(200);
    try {
        await connection?.close();
    } catch { /* já fechado */ }
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

connectWithBackoff();