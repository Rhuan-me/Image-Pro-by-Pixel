class GetUserQuery {
  constructor({ userId }) {
    this.userId = userId;
    Object.freeze(this);
  }
}

module.exports = { GetUserQuery };
