const fs = require('node:fs');
const { jwtVerify, importSPKI } = require('jose');
const { env } = require('../config/env');

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

function isPublicPath(path) {
  return env.publicAuthPaths.some(p => path === p || path.startsWith(`${p}/`));
}

async function authMiddleware(req, res, next) {
  if (!env.jwtEnabled || isPublicPath(req.path) || req.path === '/health' || req.path === '/live' || req.path === '/ready') return next();
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token Bearer obrigatório.', correlationId: req.correlationId } });
  try {
    const options = { algorithms: env.jwtAlgorithms };
    if (env.jwtIssuer) options.issuer = env.jwtIssuer;
    if (env.jwtAudience) options.audience = env.jwtAudience;
    const { payload, protectedHeader } = await jwtVerify(header.slice(7), await getVerificationKey(), options);
    req.auth = { subject: payload.sub, claims: payload, algorithm: protectedHeader.alg };
    return next();
  } catch (err) {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token inválido ou expirado.', correlationId: req.correlationId } });
  }
}
module.exports = { authMiddleware };
