/** Handler da GetImageStatusQuery: leitura pura, sem efeitos colaterais. */
function createGetImageStatusHandler({ imageRepository }) {
    return async function handle(query) {
        const image = await imageRepository.getImageById(query.imageId);
        if (!image) return null;
        const { buffer, ...safeData } = image; // nunca expõe o binário
        return safeData;
    };
}

module.exports = { createGetImageStatusHandler };