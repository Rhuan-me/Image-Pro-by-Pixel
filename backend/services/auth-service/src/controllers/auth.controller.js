const authService = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const user = await authService.register(req.validatedBody);

    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso.',
      data: user
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.validatedBody);

    return res.status(200).json({
      message: 'Login realizado com sucesso.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login };