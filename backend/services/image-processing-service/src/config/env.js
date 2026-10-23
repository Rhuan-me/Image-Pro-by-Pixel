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
  maxFileSizeMb: number(process.env.MAX_FILE_SIZE_MB, 10),
  allowedMimeTypes: csv(
    process.env.ALLOWED_MIME_TYPES,
    'image/jpeg,image/png,image/webp,image/gif'
  ),
  storageBasePath: process.env.STORAGE_BASE_PATH || '/storage/raw'
};

module.exports = { env };
