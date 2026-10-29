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