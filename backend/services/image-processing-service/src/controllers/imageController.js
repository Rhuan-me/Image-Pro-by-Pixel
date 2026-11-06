const { v4: uuidv4 } = require('uuid');
const storageService = require('../services/storage.service');
const imageStorageService = require('../services/imageStorageService');
const eventPublisherService = require('../services/eventPublisherService');

class ImageController {
  /**
   * POST /api/images/upload
   * Recebe imagem (multipart/form-data ou JSON), envia buffer para o MinIO, armazena metadados e emite ImageUploaded.
   */
  async upload(req, res, next) {
    try {
      const file = req.file;
      const body = req.body || {};

      // Validação de presença do arquivo ou dados da imagem
      const hasFile = Boolean(file);
      const hasJsonData = Boolean(body.originalName && body.mimeType);

      if (!hasFile && !hasJsonData) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_FILE',
          message: 'Nenhum arquivo de imagem foi enviado. Envie um arquivo no campo "image" (multipart/form-data) ou metadados via JSON.'
        });
      }

      // Identificação do usuário (prioridade: body, cabeçalho de proxy/auth, ou fallback)
      const userId = body.userId || req.headers['x-user-id'] || 'usr_anonymous';
      const originalName = file?.originalname || body.originalName || 'imagem.jpg';
      const mimeType = file?.mimetype || body.mimeType || 'image/jpeg';
      const imageId = `img_${Date.now()}_${uuidv4().substring(0, 8)}`;
      const extension = imageStorageService.getExtension(originalName, mimeType);
      const s3Key = `raw/${userId}/${imageId}${extension}`;

      // 1. Upload do Buffer para o MinIO local via StorageService (@aws-sdk/client-s3)
      let storageUrl = null;
      if (file?.buffer) {
        const uploadResult = await storageService.uploadFile({
          buffer: file.buffer,
          key: s3Key,
          mimeType,
          bucket: 'pixpro-storage'
        });
        storageUrl = uploadResult?.url || uploadResult?.publicUrl;
      }

      // 2. Persistência de Metadados em Memória (e PostgreSQL se ativo)
      const imageRecord = await imageStorageService.storeImage({
        imageId,
        file,
        userId,
        originalName,
        mimeType,
        storageUrl,
        s3Key
      });

      // 3. Disparo do Evento Assíncrono ImageUploaded no RabbitMQ
      let eventPayload = null;
      let eventStatus = 'PUBLISHED';
      try {
        eventPayload = await eventPublisherService.publishImageUploaded({
          imageRecord,
          correlationId: req.correlationId
        });
      } catch (eventErr) {
        console.error('[ImageController] Falha ao despachar evento para o RabbitMQ:', eventErr.message);
        eventStatus = 'BROKER_OFFLINE_PENDING_RETRY';
      }

      // 4. Resposta de Aceite (HTTP 202 Accepted - processamento assíncrono)
      return res.status(202).json({
        success: true,
        message: 'Upload aceito com sucesso. Imagem armazenada e evento de processamento disparado.',
        data: {
          imageId: imageRecord.id,
          userId: imageRecord.userId,
          originalName: imageRecord.originalName,
          mimeType: imageRecord.mimeType,
          filePath: imageRecord.filePath,
          storageUrl: imageRecord.storageUrl || storageUrl,
          url: imageRecord.storageUrl || storageUrl,
          fileSize: imageRecord.fileSize,
          status: imageRecord.status,
          eventId: eventPayload?.eventId || null,
          eventStatus,
          createdAt: imageRecord.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/images/:id
   * Consulta os metadados da imagem armazenada.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const image = await imageStorageService.getImageById(id);

      if (!image) {
        return res.status(404).json({
          success: false,
          error: 'IMAGE_NOT_FOUND',
          message: `Nenhuma imagem encontrada com o ID '${id}'.`
        });
      }

      // Omite o buffer binário bruto na resposta JSON
      const { buffer, ...safeData } = image;

      return res.status(200).json({
        success: true,
        data: safeData
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ImageController();
