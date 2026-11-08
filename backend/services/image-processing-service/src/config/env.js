const path = require('node:path');
require('dotenv').config();

const csv = (value, fallback = '') => (value ?? fallback).split(',').map(v => v.trim()).filter(Boolean);
const number = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: number(process.env.PORT, 3003),
  logLevel: process.env.LOG_LEVEL || 'dev',

  // RabbitMQ
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://pixpro:dev-rabbit-password@localhost:5672',
  rabbitmqExchange: process.env.RABBITMQ_EXCHANGE || 'pixpro.events',
  rabbitmqQueue: process.env.RABBITMQ_QUEUE || 'image-queue',
  rabbitmqRoutingKey: process.env.RABBITMQ_ROUTING_KEY || 'image.uploaded',

  // PostgreSQL
  databaseUrl: process.env.DATABASE_URL || 'postgres://pixpro:dev-postgres-password@localhost:5432/pixpro',

  // Upload & Armazenamento
  maxFileSizeMb: number(process.env.MAX_FILE_SIZE_MB, 5),
  allowedMimeTypes: csv(
    process.env.ALLOWED_MIME_TYPES,
    'image/jpeg,image/png,image/webp'
  ),
  storageBasePath: process.env.STORAGE_BASE_PATH || '/storage/raw',

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
