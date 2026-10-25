const { env } = require('../config/env');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Classifica a imagem. No modo 'simulate' devolve um resultado fixo (ponto de encaixe do MobileNet depois).
 * Arquivos com "erro" no nome disparam uma falha simulada, para testar a DLQ.
 */
async function classify(buffer, { originalName }) {
    if (env.aiMode === 'simulate') {
        await sleep(env.simulateDelayMs); // dá tempo de derrubar o worker no teste de resiliência

        if (/erro/i.test(originalName || '')) {
            const err = new Error('Falha simulada de inferência (arquivo de teste de erro).');
            err.code = 'AI_INFERENCE_ERROR';
            throw err;
        }

        return {
            modelUsed: 'simulated-v0',
            confidence: 0.98,
            tags: ['simulated', 'high_resolution']
        };
    }

    throw new Error(`AI_MODE '${env.aiMode}' ainda não implementado.`);
}

module.exports = { classify };