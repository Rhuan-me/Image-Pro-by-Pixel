function createListProjectImagesHandler({ projectRepository }) {
  return async function handle({ id, userId }) {
    await projectRepository.getById(id, userId);
    
    return projectRepository.listImages(id);
  };
}

module.exports = { createListProjectImagesHandler };