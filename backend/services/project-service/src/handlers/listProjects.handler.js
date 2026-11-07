function createListProjectsHandler({ projectRepository }) {
  return async function handle(query) {
    return projectRepository.list(query.userId);
  };
}

module.exports = { createListProjectsHandler };
