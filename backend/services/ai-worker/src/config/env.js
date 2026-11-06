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
    retryQueue: 'image-retry-queue',
    prefetch: number(process.env.PREFETCH, 1),
    maxRetries: number(process.env.MAX_RETRIES, 3),
    retryDelayMs: number(process.env.RETRY_DELAY_MS, 5000),
    requeueDelayMs: number(process.env.REQUEUE_DELAY_MS, 2000),
    maxFileBytes: number(process.env.MAX_FILE_MB, 10) * 1024 * 1024,
    rawBasePath: process.env.RAW_BASE_PATH || '/storage/raw',
    processedBasePath: process.env.PROCESSED_BASE_PATH || '/storage/processed',
    aiMode: process.env.AI_MODE || 'simulate',
    simulateDelayMs: number(process.env.SIMULATE_DELAY_MS, 3000)
};

module.exports = { env };