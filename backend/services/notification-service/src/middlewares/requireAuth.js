require('dotenv').config();

const key = process.env.JWT_SECRET
  ? new TextEncoder().encode(process.env.JWT_SECRET)
  : null;

const issuer = process.env.JWT_ISSUER;
const audience = process.env.JWT_AUDIENCE;

if (!key || !issuer || !audience) {
  throw new Error('Configuração JWT do API Gateway inválida.');
}

async function requireAuth(req, res, next) {
  const authorization = req.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Token de autenticação obrigatório.'
      }
    });
  }

  const token = authorization.slice(7).trim();

  if (!token || token.includes(' ')) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token inválido.'
      }
    });
  }

  try {
    const { jwtVerify } = await import('jose');

    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      issuer,
      audience
    });

    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new Error('Claim sub inválida.');
    }

    req.auth = { userId: payload.sub };

    return next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token inválido ou expirado.'
      }
    });
  }
}

module.exports = { requireAuth };