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
    simulateDelayMs: number(process.env.SIMULATE_DELAY_MS, 3000),

    // S3 / SeaweedFS / MinIO Storage
    s3Endpoint: process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    s3AccessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ROOT_USER || 'anykey',
    s3SecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || process.env.MINIO_ROOT_PASSWORD || 'anysecret',
    s3Bucket: process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'pixpro-storage',
    s3Region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',

    // Aliases de retrocompatibilidade
    minioEndpoint: process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    minioRootUser: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ROOT_USER || 'anykey',
    minioRootPassword: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || process.env.MINIO_ROOT_PASSWORD || 'anysecret',
    minioBucket: process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'pixpro-storage',
    minioRegion: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1'
};

module.exports = { env };
