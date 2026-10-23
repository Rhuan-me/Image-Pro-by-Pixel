const { Pool } = require('pg');
const { env } = require('./env');

let pool = null;
let isConnected = false;

function getPool() {
  if (!pool && env.databaseUrl) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    pool.on('error', (err) => {
      console.error('[PostgreSQL] Erro inesperado no pool do banco de dados:', err.message);
      isConnected = false;
    });
  }
  return pool;
}

async function initDatabase() {
  const currentPool = getPool();
  if (!currentPool) return false;

  try {
    const client = await currentPool.connect();
    try {
      console.log('[PostgreSQL] Conexão estabelecida com sucesso. Verificando tabela "images"...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS images (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          file_path VARCHAR(500) NOT NULL,
          file_size BIGINT,
          status VARCHAR(50) DEFAULT 'PENDING',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('[PostgreSQL] Tabela "images" pronta para persistência.');
      isConnected = true;
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.warn('[PostgreSQL] Não foi possível inicializar banco de dados:', error.message);
    console.warn('[PostgreSQL] Operando com persistência em memória.');
    isConnected = false;
    return false;
  }
}

async function saveImageRecord(imageRecord) {
  if (!isConnected) return null;
  const currentPool = getPool();
  if (!currentPool) return null;

  try {
    const query = `
      INSERT INTO images (id, user_id, original_name, mime_type, file_path, file_size, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE
      SET status = EXCLUDED.status, updated_at = NOW()
      RETURNING *;
    `;
    const values = [
      imageRecord.id,
      imageRecord.userId,
      imageRecord.originalName,
      imageRecord.mimeType,
      imageRecord.filePath,
      imageRecord.fileSize || 0,
      imageRecord.status || 'PENDING'
    ];
    const result = await currentPool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.warn('[PostgreSQL] Falha ao persistir imagem no banco:', error.message);
    return null;
  }
}

async function getImageRecord(imageId) {
  if (!isConnected) return null;
  const currentPool = getPool();
  if (!currentPool) return null;

  try {
    const result = await currentPool.query('SELECT * FROM images WHERE id = $1', [imageId]);
    return result.rows[0] || null;
  } catch (error) {
    return null;
  }
}

function isDatabaseConnected() {
  return isConnected;
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
  }
}

module.exports = {
  initDatabase,
  saveImageRecord,
  getImageRecord,
  isDatabaseConnected,
  closeDatabase
};
