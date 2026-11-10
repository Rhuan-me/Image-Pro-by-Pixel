function createUpdateProjectHandler({ projectRepository, validate, publishProjectUpdated }) {
  return async function handle(command) {
    const validation = validate.safeParse(command.data);
    if (!validation.success) {
      const error = new Error('Dados inválidos.');
      error.details = validation.error.format();
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const project = await projectRepository.getById(command.id, command.userId);
    await project.update(validation.data);

    try {
      await publishProjectUpdated(project);
    } catch (error) {
      console.error('[UpdateProjectHandler] Falha ao publicar evento ProjectUpdated:', error.message);
    }

    return project;
  };
}

module.exports = { createUpdateProjectHandler };
