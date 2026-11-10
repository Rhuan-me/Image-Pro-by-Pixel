class GetImageStatusQuery {
    constructor({ imageId }) {
        this.imageId = imageId;
        Object.freeze(this);
    }
}

module.exports = { GetImageStatusQuery };