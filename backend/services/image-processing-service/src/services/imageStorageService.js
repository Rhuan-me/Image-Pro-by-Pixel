const path = require('node:path');
const { v4: uuidv4 } = require('uuid');
const { env } = require('../config/env');
const { saveImageRecord, getImageRecord } = require('../config/database');

/**
 * Armazenamento em memória para simular de forma ultra-rápida o upload de arquivos
 * e realizar persistência paralela no banco PostgreSQL quando disponível.
 */
class ImageStorageService {
  constructor() {
    this.memoryStore = new Map();
  }

  /**
   * Determina extensão de arquivo a partir do nome original ou mimeType.
   */
  getExtension(filename, mimeType) {
    const extFromName = path.extname(filename || '').toLowerCase();
    if (extFromName) return extFromName;
    switch (mimeType) {
      case 'image/jpeg': return '.jpg';
      case 'image/png': return '.png';
      case 'image/webp': return '.webp';
      case 'image/gif': return '.gif';
      default: return '.img';
    }
  }

  /**
   * Salva metadados e buffer da imagem em memória e persiste no banco se ativo.
   */
  async storeImage({ file, userId = 'usr_anonymous', originalName, mimeType }) {
    const safeUserId = userId || 'usr_anonymous';
    const resolvedName = file?.originalname || originalName || 'imagem.jpg';
    const resolvedMime = file?.mimetype || mimeType || 'image/jpeg';
    const fileSize = file?.size || (file?.buffer ? file.buffer.length : 0);
    const imageId = `img_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const extension = this.getExtension(resolvedName, resolvedMime);
    const simulatedFilePath = `${env.storageBasePath}/${safeUserId}/${imageId}${extension}`;

    const record = {
      id: imageId,
      userId: safeUserId,
      originalName: resolvedName,
      mimeType: resolvedMime,
      fileSize,
      filePath: simulatedFilePath,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Armazenamento prioritário em Memória (Rápido e Desacoplado)
    this.memoryStore.set(imageId, {
      ...record,
      buffer: file?.buffer || null
    });

    // 2. Persistência no PostgreSQL (poupa trabalho futuro para o projeto)
    try {
      await saveImageRecord(record);
    } catch (dbErr) {
      console.warn(`[Storage] Imagem ${imageId} salva apenas em memória (DB offline).`);
    }

    return record;
  }

  /**
   * Busca registro de imagem por ID (em memória ou no banco).
   */
  async getImageById(imageId) {
    if (this.memoryStore.has(imageId)) {
      return this.memoryStore.get(imageId);
    }
    const dbRecord = await getImageRecord(imageId);
    if (dbRecord) {
      return {
        id: dbRecord.id,
        userId: dbRecord.user_id,
        originalName: dbRecord.original_name,
        mimeType: dbRecord.mime_type,
        fileSize: Number(dbRecord.file_size),
        filePath: dbRecord.file_path,
        status: dbRecord.status,
        createdAt: dbRecord.created_at,
        updatedAt: dbRecord.updated_at
      };
    }
    return null;
  }

  /**
   * Atualiza status do processamento.
   */
  async updateStatus(imageId, status) {
    if (this.memoryStore.has(imageId)) {
      const item = this.memoryStore.get(imageId);
      item.status = status;
      item.updatedAt = new Date().toISOString();
      this.memoryStore.set(imageId, item);
      return item;
    }
    return null;
  }

  /**
   * Limpa o storage (utilizado em testes unitários).
   */
  clear() {
    this.memoryStore.clear();
  }
}

module.exports = new ImageStorageService();
