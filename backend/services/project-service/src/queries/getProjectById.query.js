class GetProjectByIdQuery {
  constructor({ id, userId }) {
    this.id = id;
    this.userId = userId;
    Object.freeze(this);
  }
}

module.exports = { GetProjectByIdQuery };
