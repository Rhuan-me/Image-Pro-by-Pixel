function createCreateProjectHandler({ projectRepository, validate, publishProjectCreated }) {
  return async function handle(command) {
    const validation = validate.safeParse(command.data);
    if (!validation.success) {
      const error = new Error('Dados inválidos.');
      error.details = validation.error.format();
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const project = await projectRepository.create({
      userId: command.userId,
      ...validation.data
    });

    try {
      await publishProjectCreated(project);
    } catch (error) {
      console.error('[CreateProjectHandler] Falha ao publicar evento ProjectCreated:', error.message);
    }

    return project;
  };
}

module.exports = { createCreateProjectHandler };
