function createRemoveImageFromProjectHandler({ projectRepository }) {
  return async function handle({ projectId, imageId, userId }) {
    await projectRepository.getById(projectId, userId);
    return projectRepository.removeImage(projectId, imageId);
  };
}

module.exports = { createRemoveImageFromProjectHandler };