const userService = require('../services/user.service');

async function getMe(req, res, next) {
  try {
    const user = await userService.getProfile(req.auth.userId);

    return res.status(200).json({
      data: user
    });
  } catch (error) {
    next(error);
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await userService.updateProfile(
      req.auth.userId,
      req.validatedBody
    );

    return res.status(200).json({
      message: 'Perfil atualizado com sucesso.',
      data: user
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getMe, updateMe };