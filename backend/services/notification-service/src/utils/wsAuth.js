const fs = require('node:fs');
const { jwtVerify, importSPKI } = require('jose');
const { env } = require('../config/env');
const { redisClient, redisReady } = require('../middlewares/rateLimit');

let verificationKeyPromise;
function getVerificationKey() {
  if (!verificationKeyPromise) {
    verificationKeyPromise = (async () => {
      if (env.jwtAlgorithms.some(a => a.startsWith('HS'))) return new TextEncoder().encode(env.jwtSecret);
      if (!env.jwtPublicKeyPath) throw new Error('JWT_PUBLIC_KEY_PATH não configurado.');
      const pem = fs.readFileSync(env.jwtPublicKeyPath, 'utf8');
      return importSPKI(pem, env.jwtAlgorithms[0]);
    })();
  }
  return verificationKeyPromise;
}

async function verifyTokenForWebSocket(token) {
  if (!env.jwtEnabled) {
    return { subject: 'anonymous', claims: {} };
  }

  if (!token) {
    const err = new Error('Token Bearer obrigatório.');
    err.status = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const options = { algorithms: env.jwtAlgorithms };
  if (env.jwtIssuer) options.issuer = env.jwtIssuer;
  if (env.jwtAudience) options.audience = env.jwtAudience;

  const { payload, protectedHeader } = await jwtVerify(token, await getVerificationKey(), options);

  if (typeof payload.jti !== "string" || !payload.jti || !Number.isInteger(payload.exp)) {
    const err = new Error('Token sem dados de sessão válidos.');
    err.status = 401;
    err.code = 'INVALID_TOKEN';
    throw err;
  }

  try {
    await redisReady;
    const revoked = await redisClient.get(`${env.jwtRevokedPrefix}${payload.jti}`);
    if (revoked) {
      const err = new Error('Esta sessão foi encerrada.');
      err.status = 401;
      err.code = 'TOKEN_REVOKED';
      throw err;
    }
  } catch (redisErr) {
    if (redisErr.status) throw redisErr;
    const err = new Error('Não foi possível validar a sessão.');
    err.status = 503;
    err.code = 'SESSION_STORE_UNAVAILABLE';
    throw err;
  }

  return {
    subject: payload.sub,
    userId: payload.sub, // compatibilidade
    claims: payload,
    algorithm: protectedHeader.alg,
  };
}

module.exports = { verifyTokenForWebSocket };