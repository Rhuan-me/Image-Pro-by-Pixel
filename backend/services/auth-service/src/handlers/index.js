const argon2 = require('argon2');
const { UniqueConstraintError } = require('sequelize');
const User = require('../models/user.model');
const { signToken } = require('../config/jwt');
const { publishUserRegistered, publishUserLoggedIn } = require('../events/userEvents');
const { createRegisterHandler } = require('./register.handler');
const { createLoginHandler } = require('./login.handler');
const { createGetUserHandler } = require('./getUser.handler');

const userRepository = {
  create: (data) => User.create(data),
  findByEmail: (email) => User.findOne({ where: { email } }),
  findById: (id) => User.findByPk(id)
};

const register = createRegisterHandler({
  userRepository,
  passwordHasher: {
    hash: (password) => argon2.hash(password, { type: argon2.argon2id })
  },
  isUniqueConstraintError: (error) => error instanceof UniqueConstraintError,
  publishUserRegistered
});

const login = createLoginHandler({
  userRepository,
  passwordHasher: argon2,
  tokenSigner: signToken,
  publishUserLoggedIn
});

const getUser = createGetUserHandler({ userRepository });

module.exports = { register, login, getUser };
