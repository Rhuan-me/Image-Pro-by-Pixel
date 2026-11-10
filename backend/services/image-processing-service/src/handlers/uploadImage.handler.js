/**
 * Handler do UploadImageCommand: envia ao storage, grava metadados e publica ImageUploaded.
 * Falha ao publicar o evento NÃO derruba o comando (o upload já foi aceito).
 */
function createUploadImageHandler({ storageService, imageRepository, eventPublisher, idGenerator, bucket = 'pixpro-storage' }) {
    return async function handle(command) {
        const userId = command.userId || 'usr_anonymous';
        const originalName = command.file?.originalname || command.originalName || 'imagem.jpg';
        const mimeType = command.file?.mimetype || command.mimeType || 'image/jpeg';
        const imageId = idGenerator();
        const extension = imageRepository.getExtension(originalName, mimeType);
        const s3Key = `raw/${userId}/${imageId}${extension}`;

        let storageUrl = null;
        if (command.file?.buffer) {
            const uploadResult = await storageService.uploadFile({
                buffer: command.file.buffer,
                key: s3Key,
                mimeType,
                bucket
            });
            storageUrl = uploadResult?.url || uploadResult?.publicUrl || null;
        }

        const imageRecord = await imageRepository.storeImage({
            imageId,
            file: command.file,
            userId,
            originalName,
            mimeType,
            storageUrl,
            s3Key
        });

        let eventPayload = null;
        let eventStatus = 'PUBLISHED';
        try {
            eventPayload = await eventPublisher.publishImageUploaded({
                imageRecord,
                correlationId: command.correlationId
            });
        } catch (err) {
            console.error('[UploadImageHandler] Falha ao despachar evento para o RabbitMQ:', err.message);
            eventStatus = 'BROKER_OFFLINE_PENDING_RETRY';
        }

        return { imageRecord, storageUrl, eventId: eventPayload?.eventId || null, eventStatus };
    };
}

module.exports = { createUploadImageHandler };