const { UniqueConstraintError } = require('sequelize');
const User = require('../models/user.model');
const { publicUser } = require('./auth.service');

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

async function getProfile(userId) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw createError(404, 'USER_NOT_FOUND', 'Usuário não encontrado.');
  }

  return publicUser(user);
}

async function updateProfile(userId, data) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw createError(404, 'USER_NOT_FOUND', 'Usuário não encontrado.');
  }

  try {
    await user.update({
      email: data.email
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

module.exports = {
  getProfile,
  updateProfile
};