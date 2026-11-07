class CreateProjectCommand {
  constructor({ userId, data }) {
    this.userId = userId;
    this.data = data;
    Object.freeze(this);
  }
}

module.exports = { CreateProjectCommand };
