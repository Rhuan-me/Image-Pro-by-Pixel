function createAddImageToProjectHandler({ projectRepository, validate }) {
  return async function handle({ projectId, userId, body }) {
    const validation = validate.safeParse(body);
    if (!validation.success) {
      const error = new Error('Erro de validação');
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = validation.error.format();
      throw error;
    }

    // Valida se o projeto existe e pertence ao usuário
    await projectRepository.getById(projectId, userId);

    return projectRepository.addImage(projectId, validation.data);
  };
}

module.exports = { createAddImageToProjectHandler };