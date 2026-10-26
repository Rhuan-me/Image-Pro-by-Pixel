const argon2 = require('argon2');
const { UniqueConstraintError } = require('sequelize');
const User = require('../models/user.model');
const { signToken } = require('../config/jwt');

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

  const accessToken = await signToken(user.id);

  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    user: publicUser(user)
  };
}

module.exports = {
  register,
  login,
  publicUser
};