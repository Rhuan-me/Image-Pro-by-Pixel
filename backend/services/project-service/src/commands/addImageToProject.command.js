class AddImageToProjectCommand {
  constructor({ projectId, userId, body }) {
    this.projectId = projectId;
    this.userId = userId;
    this.body = body;
  }
}
module.exports = { AddImageToProjectCommand };