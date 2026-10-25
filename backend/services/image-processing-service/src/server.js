const app = require('./app');
const { env } = require('./config/env');
const { connectRabbitMQ, closeRabbitMQ } = require('./config/rabbitmq');
const { initDatabase, closeDatabase } = require('./config/database');
const { startResultsConsumer } = require('./consumers/resultsConsumer');

async function bootstrap() {
  console.log(`====================================================`);
  console.log(`  Iniciando PixPro Image Processing Service        `);
  console.log(`  Ambiente: ${env.nodeEnv} | Porta: ${env.port}    `);
  console.log(`====================================================`);

  // 1. Inicializa RabbitMQ (Event Bus)
  try {
    await connectRabbitMQ();
  } catch (err) {
    console.warn('[Bootstrap] RabbitMQ ainda não disponível. O serviço tentará reconectar em background.');
  }

  // 2. Inicializa PostgreSQL (Persistência)
  try {
    await initDatabase();
  } catch (err) {
    console.warn('[Bootstrap] PostgreSQL ainda não disponível. Operando com armazenamento em memória.');
  }
  // 3. Consome eventos de resultado (ImageProcessed / ProcessingError) e atualiza o status
  try {
    await startResultsConsumer();
  } catch (err) {
    console.warn('[Bootstrap] Não foi possível iniciar o consumidor de resultados:', err.message);
  }

  // 3. Inicia servidor HTTP
  const server = app.listen(env.port, () => {
    console.log(`[HTTP] Image Processing Service rodando em http://localhost:${env.port}`);
    console.log(`[HTTP] Endpoint de upload: POST http://localhost:${env.port}/api/images/upload`);
    console.log(`[HTTP] Healthcheck: http://localhost:${env.port}/health`);
  });

  // Encerramento Gracioso (Graceful Shutdown)
  const shutdown = async (signal) => {
    console.log(`\n[Shutdown] Sinal ${signal} recebido. Encerrando conexões com segurança...`);
    server.close(async () => {
      console.log('[Shutdown] Servidor HTTP fechado.');
      await closeRabbitMQ();
      await closeDatabase();
      console.log('[Shutdown] Conexões de mensageria e banco finalizadas.');
      process.exit(0);
    });

    // Forçar saída se demorar mais que 10 segundos
    setTimeout(() => {
      console.error('[Shutdown] Encerramento forçado por timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] Erro fatal durante inicialização:', err);
  process.exit(1);
});
