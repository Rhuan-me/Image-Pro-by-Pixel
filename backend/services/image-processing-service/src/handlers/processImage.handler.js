const STATUS_BY_EVENT = {
    ImageProcessed: 'PROCESSED',
    ImageProcessCompleted: 'PROCESSED',
    ProcessingError: 'FAILED'
};

/**
 * Handler do ProcessImageCommand: aplica o resultado do processamento no status da imagem.
 * Erro de persistência SOBE (o consumidor devolve a mensagem à fila); falha ao publicar o evento só loga.
 */
function createProcessImageHandler({ imageRepository, publishStatusChanged }) {
    return async function handle(command) {
        const status = STATUS_BY_EVENT[command.eventType];
        if (!status || !command.imageId) {
            return { applied: false, reason: 'IGNORED_EVENT' };
        }

        await imageRepository.updateStatus(command.imageId, status, {
            processedFilePath: command.processedFilePath,
            processedStorageUrl: command.processedStorageUrl
        });

        try {
            await publishStatusChanged({
                imageId: command.imageId,
                status,
                processedStorageUrl: command.processedStorageUrl,
                correlationId: command.correlationId
            });
        } catch (err) {
            console.warn(`[ProcessImageHandler] Evento ImageStatusChanged não publicado: ${err.message}`);
        }

        return { applied: true, status };
    };
}

module.exports = { createProcessImageHandler };