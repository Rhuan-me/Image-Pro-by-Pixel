const { randomUUID } = require('node:crypto');
require('dotenv').config();

function getJwtConfig() {
  const { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } = process.env;

  if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, 'utf8') < 32) {
    throw new Error('JWT_SECRET deve ter pelo menos 32 bytes.');
  }

  if (!JWT_ISSUER || !JWT_AUDIENCE) {
    throw new Error('JWT_ISSUER e JWT_AUDIENCE são obrigatórios.');
  }

  return {
    key: new TextEncoder().encode(JWT_SECRET),
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  };
}

async function signToken({ userId, email, roles }) {
  const { SignJWT } = await import("jose");
  const { key, issuer, audience } = getJwtConfig();

  if (
    typeof userId !== "string" ||
    !userId ||
    typeof email !== "string" ||
    !email ||
    !Array.isArray(roles)
  ) {
    throw new Error("Dados inválidos para gerar o token JWT.");
  }

  return new SignJWT({
    userId,
    email,
    roles,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setJti(randomUUID())
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || '15m')
    .sign(key);
}

async function verifyToken(token) {
  const { jwtVerify } = await import('jose');
  const { key, issuer, audience } = getJwtConfig();

  const { payload } = await jwtVerify(token, key, {
    algorithms: ['HS256'],
    issuer,
    audience
  });
  if ( typeof payload.jti !== 'string' ||  !payload.jti || !Number.isInteger(payload.exp)) {
    throw new Error('Claims de sessão inválidos.');
  }

  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('Token sem identificador de usuário.');
  }

  if (
    payload.userId !== payload.sub ||
    typeof payload.email !== "string" ||
    !Array.isArray(payload.roles)
  ) {
    throw new Error("Claims obrigatórios do token JWT inválidos.");
  }

  return payload;
}

module.exports = { signToken, verifyToken };