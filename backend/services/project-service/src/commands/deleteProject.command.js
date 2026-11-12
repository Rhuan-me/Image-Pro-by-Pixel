class DeleteProjectCommand {
  constructor({ id, userId }) {
    this.id = id;
    this.userId = userId;
  }
}
module.exports = { DeleteProjectCommand };