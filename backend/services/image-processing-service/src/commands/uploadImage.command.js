class UploadImageCommand {
    constructor({ userId, originalName, mimeType, file, correlationId }) {
        this.userId = userId;
        this.originalName = originalName;
        this.mimeType = mimeType;
        this.file = file || null;
        this.correlationId = correlationId;
        Object.freeze(this);
    }
}

module.exports = { UploadImageCommand };