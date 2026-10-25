const path = require('node:path');
const { v4: uuidv4 } = require('uuid');
const { env } = require('../config/env');
const Image = require('../models/image.model');
const { isDatabaseConnected } = require('../config/database');
const fs = require('node:fs/promises');

/**
 * Armazenamento em memória para simular de forma ultra-rápida o upload de arquivos
 * e realizar persistência paralela no PostgreSQL via Sequelize quando disponível.
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
   * Salva metadados e buffer da imagem em memória e persiste no banco via Sequelize se ativo.
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
    // 1b. Grava o arquivo em disco (volume compartilhado com o ai-worker)
    if (file?.buffer) {
      try {
        await fs.mkdir(path.dirname(simulatedFilePath), { recursive: true });
        await fs.writeFile(simulatedFilePath, file.buffer);
      } catch (fsErr) {
        console.warn(`[Storage] Falha ao gravar ${simulatedFilePath}:`, fsErr.message);
      }
    }

    // 2. Persistência no PostgreSQL via Sequelize (poupa trabalho futuro para o projeto)
    if (isDatabaseConnected()) {
      try {
        await Image.upsert({
          id: imageId,
          userId: safeUserId,
          originalName: resolvedName,
          mimeType: resolvedMime,
          fileSize,
          filePath: simulatedFilePath,
          status: 'PENDING'
        });
      } catch (dbErr) {
        console.warn(`[Sequelize] Falha ao persistir imagem ${imageId}:`, dbErr.message);
      }
    }

    return record;
  }

  /**
   * Busca registro de imagem por ID (em memória ou no banco via Sequelize).
   */
  async getImageById(imageId) {
    if (this.memoryStore.has(imageId)) {
      return this.memoryStore.get(imageId);
    }

    if (isDatabaseConnected()) {
      try {
        const dbRecord = await Image.findByPk(imageId);
        if (dbRecord) {
          return dbRecord.toJSON();
        }
      } catch (dbErr) {
        console.warn(`[Sequelize] Falha ao buscar imagem ${imageId}:`, dbErr.message);
      }
    }

    return null;
  }

  /**
   * Atualiza status do processamento (em memória e no Sequelize).
   */
  async updateStatus(imageId, status) {
    let updated = null;

    if (this.memoryStore.has(imageId)) {
      const item = this.memoryStore.get(imageId);
      item.status = status;
      item.updatedAt = new Date().toISOString();
      this.memoryStore.set(imageId, item);
      updated = item;
    }

    if (isDatabaseConnected()) {
      try {
        await Image.update({ status }, { where: { id: imageId } });
      } catch (dbErr) {
        console.warn(`[Sequelize] Falha ao atualizar status ${imageId}:`, dbErr.message);
      }
    }

    return updated;
  }

  /**
   * Limpa o storage (utilizado em testes unitários).
   */
  clear() {
    this.memoryStore.clear();
  }
}

module.exports = new ImageStorageService();
