
require('dotenv').config();

const app = require('./app');
const sequelize = require('./config/database');

const port = Number(process.env.PORT) || 3001;

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`PixPro Auth Service rodando na porta ${port}`);
    });

    let closing = false;

    async function shutdown(signal) {
      if (closing) return;
      closing = true;

      console.log(`Recebido ${signal}; encerrando Auth Service...`);

      const timeout = setTimeout(() => {
        console.error('Tempo limite excedido ao encerrar o serviço.');
        process.exit(1);
      }, 10000);

      timeout.unref();

      server.close(async () => {
        try {
          await sequelize.close();
          clearTimeout(timeout);
          process.exit(0);
        } catch (error) {
          console.error('Erro ao encerrar:', error.message);
          process.exit(1);
        }
      });
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Falha ao iniciar Auth Service:', error.message);

    try {
      await sequelize.close();
    } catch (closeError) {
      console.error('Erro ao fechar conexão:', closeError.message);
    }

    process.exit(1);
  }
}

start();
