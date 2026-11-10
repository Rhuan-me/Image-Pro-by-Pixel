class UpdateProjectCommand {
  constructor({ id, userId, data }) {
    this.id = id;
    this.userId = userId;
    this.data = data;
    Object.freeze(this);
  }
}

module.exports = { UpdateProjectCommand };
