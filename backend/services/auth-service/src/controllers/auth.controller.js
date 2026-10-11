
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

module.exports = { register };
