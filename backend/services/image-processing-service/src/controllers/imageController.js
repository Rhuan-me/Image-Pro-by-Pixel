const { UploadImageCommand } = require('../commands/uploadImage.command');
const { GetImageStatusQuery } = require('../queries/getImageStatus.query');
const { uploadImage, getImageStatus } = require('../handlers');

class ImageController {
  /**
   * POST /api/images/upload
   * Valida a entrada HTTP e delega ao UploadImageCommand.
   */
  async upload(req, res, next) {
    try {
      const file = req.file;
      const body = req.body || {};

      const hasFile = Boolean(file);
      const hasJsonData = Boolean(body.originalName && body.mimeType);

      if (!hasFile && !hasJsonData) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_FILE',
          message: 'Nenhum arquivo de imagem foi enviado. Envie um arquivo no campo "image" (multipart/form-data) ou metadados via JSON.'
        });
      }

      const command = new UploadImageCommand({
        userId: body.userId || req.headers['x-user-id'] || 'usr_anonymous',
        originalName: body.originalName,
        mimeType: body.mimeType,
        file,
        correlationId: req.correlationId
      });

      const { imageRecord, storageUrl, eventId, eventStatus } = await uploadImage(command);

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
          eventId,
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
   * Delega à GetImageStatusQuery.
   */
  async getById(req, res, next) {
    try {
      const image = await getImageStatus(new GetImageStatusQuery({ imageId: req.params.id }));

      if (!image) {
        return res.status(404).json({
          success: false,
          error: 'IMAGE_NOT_FOUND',
          message: `Nenhuma imagem encontrada com o ID '${req.params.id}'.`
        });
      }

      return res.status(200).json({ success: true, data: image });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ImageController();