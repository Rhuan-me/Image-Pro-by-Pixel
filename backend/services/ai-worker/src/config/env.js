const number = (value, fallback) => {
    const n = Number(value);
    return value !== undefined && Number.isFinite(n) && n >= 0 ? n : fallback;
};

const env = {
    rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://pixpro:dev-rabbit-password@localhost:5672',
    exchange: 'pixpro.events',
    queue: 'image-queue',
    routingKeyIn: 'image.uploaded',
    dlx: 'pixpro.events.dlx',
    dlq: 'image-dlq',
    resultsQueue: 'image-results-queue',
    prefetch: number(process.env.PREFETCH, 1),
    rawBasePath: process.env.RAW_BASE_PATH || '/storage/raw',
    processedBasePath: process.env.PROCESSED_BASE_PATH || '/storage/processed',
    aiMode: process.env.AI_MODE || 'simulate',
    simulateDelayMs: number(process.env.SIMULATE_DELAY_MS, 3000)
};

module.exports = { env };