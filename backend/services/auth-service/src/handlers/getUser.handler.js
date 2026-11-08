function createGetUserHandler({ userRepository }) {
  return async function handle(query) {
    const user = await userRepository.findById(query.userId);

    if (!user) {
      const error = new Error('Usuário não encontrado.');
      error.status = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  };
}

module.exports = { createGetUserHandler };
