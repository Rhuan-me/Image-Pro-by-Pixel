const authService = require('../services/auth.service');
const { RegisterCommand } = require('../commands/register.command');
const { LoginCommand } = require('../commands/login.command');
const { register: registerHandler, login: loginHandler } = require('../handlers');

async function register(req, res, next) {
  try {
    const user = await registerHandler(new RegisterCommand(req.validatedBody));

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
    const result = await loginHandler(new LoginCommand(req.validatedBody));

    return res.status(200).json({
      message: 'Login realizado com sucesso.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}



async function logout(req, res, next) {
  try {
    const header = req.get('authorization') || '';

    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token Bearer obrigatório.'
        }
      });
    }

    const token = header.slice(7).trim();
    await authService.logout(token);

    return res.status(200).json({
      message: 'Logout realizado com sucesso.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, logout };
