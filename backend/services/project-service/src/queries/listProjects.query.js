class ListProjectsQuery {
  constructor({ userId }) {
    this.userId = userId;
    Object.freeze(this);
  }
}

module.exports = { ListProjectsQuery };
