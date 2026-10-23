const { Sequelize } = require('sequelize');
const { env } = require('./env');

let isConnected = false;

const sequelize = new Sequelize(env.databaseUrl, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

/**
 * Inicializa a conexão com o banco de dados e sincroniza os modelos Sequelize.
 */
async function initDatabase() {
  try {
    console.log('[Sequelize] Conectando ao PostgreSQL via Sequelize...');
    await sequelize.authenticate();
    console.log('[Sequelize] Conexão com PostgreSQL autenticada com sucesso.');

    // Sincroniza as tabelas (cria a tabela 'images' caso não exista)
    await sequelize.sync();
    console.log('[Sequelize] Modelos sincronizados com o banco de dados.');

    isConnected = true;
    return true;
  } catch (error) {
    console.warn('[Sequelize] Banco de dados indisponível:', error.message);
    console.warn('[Sequelize] Operando com persistência em memória (resiliência).');
    isConnected = false;
    return false;
  }
}

function isDatabaseConnected() {
  return isConnected;
}

async function closeDatabase() {
  try {
    await sequelize.close();
  } catch (err) {
    console.error('[Sequelize] Erro ao fechar conexão:', err.message);
  } finally {
    isConnected = false;
  }
}

module.exports = {
  sequelize,
  initDatabase,
  isDatabaseConnected,
  closeDatabase
};
