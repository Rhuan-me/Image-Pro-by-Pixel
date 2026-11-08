const { env } = require('../config/env');
const { getChannel } = require('../config/rabbitmq');
const { ProcessImageCommand } = require('../commands/processImage.command');
const { processImage } = require('../handlers');

const RESULTS_QUEUE = 'image-results-queue';

/**
 * Consome os eventos de resultado do ai-worker e os transforma em ProcessImageCommand.
 */
async function startResultsConsumer() {
    const channel = getChannel();
    if (!channel) {
        console.warn('[ResultsConsumer] Canal RabbitMQ indisponível. Consumidor de resultados não iniciado.');
        return false;
    }

    // Declaração idempotente (mesmos argumentos do ai-worker)
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

        const command = new ProcessImageCommand({
            imageId: event?.data?.imageId,
            eventType: event?.eventType,
            processedFilePath: event?.data?.processedFilePath,
            processedStorageUrl: event?.data?.processedStorageUrl || event?.data?.url,
            correlationId: msg.properties?.correlationId
        });

        try {
            const result = await processImage(command);
            if (result.applied) {
                console.log(`[ResultsConsumer] ${command.eventType}: imagem ${command.imageId} -> ${result.status}`);
            } else {
                console.warn(`[ResultsConsumer] Evento ignorado (tipo: ${command.eventType}).`);
            }
            channel.ack(msg);
        } catch (err) {
            console.error(`[ResultsConsumer] Erro ao aplicar resultado de ${command.imageId}:`, err.message);
            setTimeout(() => {
                try { channel.nack(msg, false, true); } catch { /* canal fechado: o broker reentrega */ }
            }, 2000); // devolve à fila: não perde o resultado se o banco estiver fora
        }
    }, { noAck: false });

    console.log(`[ResultsConsumer] Aguardando eventos em '${RESULTS_QUEUE}'.`);
    return true;
}

module.exports = { startResultsConsumer };