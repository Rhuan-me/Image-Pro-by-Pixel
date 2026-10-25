const { verifyToken } = require('../config/jwt');

async function authenticate(req, res, next) {
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
    const payload = await verifyToken(token);
    req.auth = {
      userId: payload.sub
    };

    return next();
  } catch {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token inválido ou expirado.'
      }
    });
  }
}

module.exports = { authenticate };