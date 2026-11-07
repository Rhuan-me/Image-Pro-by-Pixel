function createRegisterHandler({ userRepository, passwordHasher, isUniqueConstraintError, publishUserRegistered }) {
  return async function handle(command) {
    const passwordHash = await passwordHasher.hash(command.password);

    try {
      const user = await userRepository.create({
        email: command.email,
        passwordHash
      });
      const publicUser = {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      try {
        await publishUserRegistered(publicUser);
      } catch (error) {
        console.error('[RegisterHandler] Falha ao publicar evento UserRegistered:', error.message);
      }

      return publicUser;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const conflict = new Error('Este e-mail já está cadastrado.');
        conflict.status = 409;
        conflict.code = 'EMAIL_ALREADY_EXISTS';
        throw conflict;
      }
      throw error;
    }
  };
}

module.exports = { createRegisterHandler };
