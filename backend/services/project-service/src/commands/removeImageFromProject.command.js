class RemoveImageFromProjectCommand {
  constructor({ projectId, imageId, userId }) {
    this.projectId = projectId;
    this.imageId = imageId;
    this.userId = userId;
  }
}
module.exports = { RemoveImageFromProjectCommand };