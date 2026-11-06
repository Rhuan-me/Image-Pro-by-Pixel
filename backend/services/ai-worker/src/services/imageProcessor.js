const sharp = require('sharp');

/**
 * Módulo de processamento de imagem com Sharp no ai-worker.
 * Executa manipulações e efeitos visuais em milissegundos sem estourar memória.
 */
class ImageProcessor {
    /**
     * Aplica efeito visual na imagem via Sharp (grayscale com realce/sharpen).
     * @param {string|Buffer} input - Caminho do arquivo ou Buffer da imagem
     * @param {Object} options - Opções adicionais de processamento
     * @returns {Promise<{buffer: Buffer, format: string, width: number, height: number, effectApplied: string}>}
     */
    async applyVisualEffect(input, options = {}) {
        try {
            const pipeline = sharp(input);
            const metadata = await pipeline.metadata();

            if (!metadata.format) {
                const err = new Error('Formato de imagem não reconhecido ou corrompido.');
                err.code = 'IMAGE_CORRUPTED';
                err.retryable = false;
                throw err;
            }

            // Pipeline de efeito visual profissional:
            // 1. Auto-orientação baseada no EXIF
            // 2. Conversão para tons de cinza (grayscale)
            // 3. Realce de nitidez e contraste (sharpen)
            let transformer = pipeline.rotate().grayscale().sharpen();

            if (options.resize) {
                transformer = transformer.resize(options.resize.width, options.resize.height, { fit: 'inside' });
            }

            const processedBuffer = await transformer.toBuffer();

            return {
                buffer: processedBuffer,
                format: metadata.format,
                width: metadata.width,
                height: metadata.height,
                effectApplied: 'grayscale+sharpen'
            };
        } catch (err) {
            // Se o erro já foi classificado, propaga diretamente
            if (err.code === 'IMAGE_CORRUPTED') {
                throw err;
            }

            // Exceções do Sharp (ex: buffer truncado, bytes aleatórios, arquivo corrompido)
            const isCorrupted = /unsupported|vips|corrupt|input buffer/i.test(err.message);
            const processingError = new Error(`Falha no processamento Sharp: ${err.message}`);
            processingError.code = isCorrupted ? 'IMAGE_CORRUPTED' : 'IMAGE_PROCESSING_FAILED';
            processingError.retryable = false; // falha de renderização de imagem corrompida é definitiva
            throw processingError;
        }
    }
}

module.exports = new ImageProcessor();
