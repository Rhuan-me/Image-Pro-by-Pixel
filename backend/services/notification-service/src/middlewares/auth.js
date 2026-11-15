const fs = require('node:fs');
const { jwtVerify, importSPKI } = require('jose');
const { env } = require('../config/env');
const { redisClient, redisReady } = require('./rateLimit');

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
  // BLINDAGEM: Garante que se publicAuthPaths não for um array, ele retorna falso sem quebrar
  const paths = Array.isArray(env.publicAuthPaths) ? env.publicAuthPaths : [];
  return paths.some(p => path === p || path.startsWith(`${p}/`));
}

async function authMiddleware(req, res, next) {
  try {
    // Log para rastrear se o middleware entrou e qual path está analisando
    console.log('[Auth Middleware] Analisando path:', req.path);

    if (!env.jwtEnabled || isPublicPath(req.path || '') || req.path === '/health' || req.path === '/live' || req.path === '/ready') {
      console.log('[Auth Middleware] Path público ou JWT desabilitado. Permitindo acesso.');
      return next();
    }

    const header = req.get('authorization') || '';
    if (!header.startsWith('Bearer ')) {
      console.log('[Auth Middleware] Header Authorization ausente ou inválido.');
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token Bearer obrigatório.', correlationId: req.correlationId } });
    }

    const options = { algorithms: env.jwtAlgorithms };
    if (env.jwtIssuer) options.issuer = env.jwtIssuer;
    if (env.jwtAudience) options.audience = env.jwtAudience;
    
    const { payload, protectedHeader } = await jwtVerify(header.slice(7), await getVerificationKey(), options);
    
    if (
      typeof payload.jti !== "string" ||
      !payload.jti ||
      !Number.isInteger(payload.exp)
    ) {
      return res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "Token sem dados de sessão válidos.",
          correlationId: req.correlationId,
        },
      });
    }

    let revoked;
    try {
      await redisReady;
      revoked = await redisClient.get(`${env.jwtRevokedPrefix}${payload.jti}`);
    } catch (redisErr) {
      console.error('[Auth Middleware] Erro ao consultar Redis:', redisErr.message);
      return res.status(503).json({
        error: {
          code: "SESSION_STORE_UNAVAILABLE",
          message: "Não foi possível validar a sessão.",
          correlationId: req.correlationId,
        },
      });
    }

    if (revoked) {
      return res.status(401).json({
        error: {
          code: "TOKEN_REVOKED",
          message: "Esta sessão foi encerrada.",
          correlationId: req.correlationId,
        },
      });
    }

    req.auth = {
      subject: payload.sub,
      claims: payload,
      algorithm: protectedHeader.alg,
    };

    return next();

  } catch (err) {
    console.log('[Auth Middleware] Falha na validação do JWT:', err.message);
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token inválido ou expirado.', correlationId: req.correlationId } });
  }
}
module.exports = { authMiddleware };
