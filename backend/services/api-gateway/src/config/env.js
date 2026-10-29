const path = require('node:path');
require('dotenv').config();

const csv = (value, fallback = '') => (value ?? fallback).split(',').map(v => v.trim()).filter(Boolean);
const number = (value, fallback) => { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : fallback; };

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: number(process.env.PORT, 8000),
  logLevel: process.env.LOG_LEVEL || 'dev',
  corsOrigins: csv(process.env.CORS_ORIGINS, 'http://localhost:5173,http://localhost:3000'),
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  projectServiceUrl: process.env.PROJECT_SERVICE_URL || 'http://localhost:3002',
  imageServiceUrl: process.env.IMAGE_SERVICE_URL || 'http://localhost:3003',
  proxyTimeoutMs: number(process.env.PROXY_TIMEOUT_MS, 30000),
  jsonLimit: process.env.JSON_LIMIT || '1mb',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisKeyPrefix: process.env.REDIS_KEY_PREFIX || 'pixpro:gateway:rl:',
  rateLimitWindowMs: number(process.env.RATE_LIMIT_WINDOW_MS, 60000),
  rateLimitMax: number(process.env.RATE_LIMIT_MAX, 120),
  authRateLimitMax: number(process.env.AUTH_RATE_LIMIT_MAX, 20),
  jwtEnabled: process.env.JWT_ENABLED === 'true',
  jwtAlgorithms: csv(process.env.JWT_ALGORITHMS, 'HS256'),
  jwtSecret: process.env.JWT_SECRET || '',
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH ? path.resolve(process.env.JWT_PUBLIC_KEY_PATH) : '',
  jwtIssuer: process.env.JWT_ISSUER || undefined,
  jwtAudience: process.env.JWT_AUDIENCE || undefined,
  jwtRevokedPrefix: process.env.JWT_REVOKED_PREFIX || 'pixpro:auth:revoked:',
  publicAuthPaths: csv(process.env.PUBLIC_AUTH_PATHS, '/api/auth/login,/api/auth/register,/api/v1/auth/login,/api/v1/auth/register,/api/v1/auth/forgot-password,/api/v1/auth/refresh')
};

function validateEnv() {
  if (env.nodeEnv === 'production') {
    if (!env.corsOrigins.length || env.corsOrigins.includes('*')) throw new Error('Configure CORS_ORIGINS explicitamente em produção.');
    if (env.jwtEnabled && !env.jwtSecret && !env.jwtPublicKeyPath) throw new Error('JWT_ENABLED exige JWT_SECRET ou JWT_PUBLIC_KEY_PATH.');
    if (!process.env.REDIS_URL) throw new Error('REDIS_URL deve ser configurada em produção.');
  }
  if (env.jwtEnabled) {
    if (env.jwtAlgorithms.includes('HS256') && !env.jwtSecret) throw new Error('JWT_SECRET é obrigatório para HS256.');
    if (env.jwtAlgorithms.some(a => ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'].includes(a)) && !env.jwtPublicKeyPath) throw new Error('JWT_PUBLIC_KEY_PATH é obrigatório para algoritmos assimétricos.');
  }
}

module.exports = { env, validateEnv };
