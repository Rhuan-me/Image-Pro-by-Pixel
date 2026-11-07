function createGetProjectByIdHandler({ projectRepository }) {
  return async function handle(query) {
    return projectRepository.getById(query.id, query.userId);
  };
}

module.exports = { createGetProjectByIdHandler };
