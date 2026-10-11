
const argon2 = require('argon2');
const { UniqueConstraintError } = require('sequelize');
const User = require('../models/user.model');

async function register({ email, password }) {
  const existingUser = await User.findOne({
    where: { email }
  });

  if (existingUser) {
    const error = new Error('Este e-mail já está cadastrado.');
    error.status = 409;
    error.code = 'EMAIL_ALREADY_EXISTS';
    throw error;
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id
  });

  try {
    const user = await User.create({
      email,
      passwordHash
    });

    return {
      id: user.id,
      email: user.email,
      createdAt: user.created_at
    };
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      const conflict = new Error('Este e-mail já está cadastrado.');
      conflict.status = 409;
      conflict.code = 'EMAIL_ALREADY_EXISTS';
      throw conflict;
    }

    throw error;
  }
}

module.exports = { register };
