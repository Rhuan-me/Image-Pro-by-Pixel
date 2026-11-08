/** Comando disparado por evento do broker (ImageProcessed / ProcessingError). */
class ProcessImageCommand {
    constructor({ imageId, eventType, processedFilePath, processedStorageUrl, correlationId }) {
        this.imageId = imageId;
        this.eventType = eventType;
        this.processedFilePath = processedFilePath;
        this.processedStorageUrl = processedStorageUrl;
        this.correlationId = correlationId;
        Object.freeze(this);
    }
}

module.exports = { ProcessImageCommand };