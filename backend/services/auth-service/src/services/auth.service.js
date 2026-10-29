const argon2 = require('argon2');
const { UniqueConstraintError } = require('sequelize');
const User = require('../models/user.model');
const { signToken, verifyToken } = require('../config/jwt');
const { redisClient, redisReady } = require('../config/redis');
const revokedPrefix = process.env.JWT_REVOKED_PREFIX || 'pixpro:auth:revoked:';

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

async function register({ email, password }) {
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id
  });

  try {
    const user = await User.create({
      email,
      passwordHash
    });

    return publicUser(user);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw createError(
        409,
        'EMAIL_ALREADY_EXISTS',
        'Este e-mail já está cadastrado.'
      );
    }

    throw error;
  }
}

async function login({ email, password }) {
  const user = await User.findOne({
    where: { email }
  });

  if (!user || !(await argon2.verify(user.passwordHash, password))) {
    throw createError(
      401,
      'INVALID_CREDENTIALS',
      'E-mail ou senha incorretos.'
    );
  }

  const roles = ['user'];

  const accessToken = await signToken({
    userId: String(user.id),
    email: user.email,
    roles,
  });

  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    user: {
      ...publicUser(user),
      roles,
    },
  };
}

async function logout(token) {
  let payload;

  try {
    payload = await verifyToken(token);
  } catch {
    throw createError(401, "INVALID_TOKEN", "Token inválido ou expirado.");
  }

  if (!payload.jti || !Number.isInteger(payload.exp)) {
    throw createError(
      401,
      "INVALID_TOKEN",
      "Token sem dados de sessão válidos.",
    );
  }

  const ttl = payload.exp - Math.floor(Date.now() / 1000);

  if (ttl <= 0) {
    throw createError(401, "INVALID_TOKEN", "Token inválido ou expirado.");
  }

  try {
    await redisReady;

    await redisClient.set(`${revokedPrefix}${payload.jti}`, "1", { EX: ttl });
  } catch {
    throw createError(
      503,
      "SESSION_STORE_UNAVAILABLE",
      "Não foi possível encerrar a sessão. Tente novamente.",
    );
  }

  return { revoked: true };
}

module.exports = {
  register,
  login,
  publicUser,
  logout,
};