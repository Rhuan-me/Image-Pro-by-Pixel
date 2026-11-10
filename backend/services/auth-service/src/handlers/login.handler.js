function createLoginHandler({ userRepository, passwordHasher, tokenSigner, publishUserLoggedIn }) {
  return async function handle(command) {
    const user = await userRepository.findByEmail(command.email);

    if (!user || !(await passwordHasher.verify(user.passwordHash, command.password))) {
      const error = new Error('E-mail ou senha incorretos.');
      error.status = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const roles = ['user'];
    const accessToken = await tokenSigner({
      userId: String(user.id),
      email: user.email,
      roles
    });
    const publicUser = {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles
    };

    try {
      await publishUserLoggedIn(publicUser);
    } catch (error) {
      console.error('[LoginHandler] Falha ao publicar evento UserLoggedIn:', error.message);
    }

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      user: publicUser
    };
  };
}

module.exports = { createLoginHandler };
