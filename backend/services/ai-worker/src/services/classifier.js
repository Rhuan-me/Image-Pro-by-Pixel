const { env } = require('../config/env');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Classifica a imagem. No modo 'simulate' devolve um resultado fixo (ponto de encaixe do MobileNet).
 * - nome com "erro": falha definitiva (vai para a DLQ)
 * - nome com "temp": falha temporária nas 2 primeiras tentativas (demonstra o retry)
 */
async function classify(filePath, { originalName, attempt = 0 }) {
    if (env.aiMode === 'simulate') {
        await sleep(env.simulateDelayMs);

        if (/erro/i.test(originalName || '')) {
            throw Object.assign(new Error('Falha simulada de inferência (arquivo de teste de erro).'), {
                code: 'AI_INFERENCE_ERROR',
                retryable: false
            });
        }
        if (/temp/i.test(originalName || '') && attempt < 2) {
            throw Object.assign(new Error('Falha temporária simulada.'), {
                code: 'SIMULATED_TRANSIENT',
                retryable: true
            });
        }

        return { modelUsed: 'simulated-v0', confidence: 0.98, tags: ['simulated', 'high_resolution'] };
    }

    throw Object.assign(new Error(`AI_MODE '${env.aiMode}' ainda não implementado.`), {
        code: 'AI_MODE_UNSUPPORTED',
        retryable: false
    });
}

module.exports = { classify };