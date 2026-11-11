function createDeleteProjectHandler({ projectRepository }) {
  return async function handle({ id, userId }) {
    const project = await projectRepository.getById(id, userId);
    return projectRepository.delete(project);
  };
}

module.exports = { createDeleteProjectHandler };