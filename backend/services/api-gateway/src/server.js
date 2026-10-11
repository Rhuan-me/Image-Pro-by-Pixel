const app = require('./app');
const { env, validateEnv } = require('./config/env');
const { redisClient, redisReady } = require('./middlewares/rateLimit');

async function start() {
  try {
    validateEnv();
    await redisReady;
    const server = app.listen(env.port, () => console.log(`PixPro API Gateway ouvindo na porta ${env.port}`));
    let closing = false;
    const shutdown = signal => {
      if (closing) return;
      closing = true;
      console.log(`Recebido ${signal}; encerrando Gateway...`);
      server.close(async () => {
        try { if (redisClient.isOpen) await redisClient.quit(); }
        finally { process.exit(0); }
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Falha ao iniciar API Gateway:', error.message);
    process.exit(1);
  }
}
start();
