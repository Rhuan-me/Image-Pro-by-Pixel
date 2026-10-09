/**
 * @file server.js
 * @description Ponto de entrada do API Gateway do PixPro.
 */

const createApp = require('./app');
const config = require('./config/environment');

const app = createApp();

const server = app.listen(config.port, () => {
  console.log('======================================================');
  console.log(`PixPro API Gateway rodando na porta ${config.port}`);
  console.log(`Ambiente: ${config.nodeEnv}`);
  console.log(`CORS Origin: ${config.cors.origin}`);
  console.log(`Auth Service Downstream: ${config.services.auth.url}`);
  console.log(`Project Service Downstream: ${config.services.project.url}`);
  console.log(`Image Processing Downstream: ${config.services.imageProcessing.url}`);
  console.log(`Health Check: http://localhost:${config.port}/health`);
  console.log('======================================================');
});

// Tratamento de término gracioso (Graceful Shutdown)
function gracefulShutdown(signal) {
  console.log(`\nSinal ${signal} recebido. Encerrando o API Gateway de forma graciosa...`);
  server.close(() => {
    console.log('Servidor HTTP finalizado.');
    process.exit(0);
  });

  // Força encerramento se travar por mais de 10s
  setTimeout(() => {
    console.error('Encerramento forçado após timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = server;
