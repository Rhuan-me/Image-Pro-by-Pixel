class ListImagesQuery {
  constructor({ imageId, userId }) {
    this.imageId = imageId;
    this.userId = userId;
    Object.freeze(this);
  }
}

module.exports = { ListImagesQuery };
