const { env } = require('../config/env');
const { getChannel } = require('../config/rabbitmq');
const imageStorageService = require('../services/imageStorageService');

const RESULTS_QUEUE = 'image-results-queue';
const STATUS_BY_EVENT = {
    ImageProcessed: 'PROCESSED',
    ImageProcessCompleted: 'PROCESSED',
    ProcessingError: 'FAILED'
};

/**
 * Consome os eventos de resultado publicados pelo ai-worker e atualiza o status da imagem.
 */
async function startResultsConsumer() {
    const channel = getChannel();
    if (!channel) {
        console.warn('[ResultsConsumer] Canal RabbitMQ indisponível. Consumidor de resultados não iniciado.');
        return false;
    }

    // Declaração idempotente (mesmos argumentos do ai-worker): evita erro se este serviço subir antes do worker
    await channel.assertExchange(env.rabbitmqExchange, 'topic', { durable: true });
    await channel.assertQueue(RESULTS_QUEUE, { durable: true });
    await channel.bindQueue(RESULTS_QUEUE, env.rabbitmqExchange, 'image.processed');
    await channel.bindQueue(RESULTS_QUEUE, env.rabbitmqExchange, 'image.failed');
    await channel.prefetch(5);

    await channel.consume(RESULTS_QUEUE, async (msg) => {
        if (!msg) return; // consumidor cancelado pelo broker

        let event;
        try {
            event = JSON.parse(msg.content.toString());
        } catch {
            console.error('[ResultsConsumer] Mensagem inválida (não é JSON). Descartando.');
            return channel.ack(msg);
        }

        const status = STATUS_BY_EVENT[event.eventType];
        const imageId = event.data?.imageId;
        if (!status || !imageId) {
            console.warn(`[ResultsConsumer] Evento ignorado (tipo: ${event.eventType}).`);
            return channel.ack(msg);
        }

        try {
            await imageStorageService.updateStatus(imageId, status, {
                processedFilePath: event.data?.processedFilePath,
                processedStorageUrl: event.data?.processedStorageUrl || event.data?.url
            });
            console.log(`[ResultsConsumer] ${event.eventType}: imagem ${imageId} -> ${status}`);
            channel.ack(msg);
        } catch (err) {
            console.error(`[ResultsConsumer] Erro ao atualizar ${imageId}:`, err.message);
            setTimeout(() => {
                try { channel.nack(msg, false, true); } catch { /* canal fechado: o broker reentrega */ }
            }, 2000); // devolve à fila: não perde o resultado se o banco estiver fora
        }
    }, { noAck: false });

    console.log(`[ResultsConsumer] Aguardando eventos em '${RESULTS_QUEUE}'.`);
    return true;
}

module.exports = { startResultsConsumer };
