const { v4: uuidv4 } = require('uuid');
const storageService = require('../services/storage.service');
const imageStorageService = require('../services/imageStorageService');
const eventPublisherService = require('../services/eventPublisherService');
const { publishImageStatusChanged } = require('../events/imageStatusChanged');
const { createUploadImageHandler } = require('./uploadImage.handler');
const { createProcessImageHandler } = require('./processImage.handler');
const { createGetImageStatusHandler } = require('./getImageStatus.handler');

const uploadImage = createUploadImageHandler({
    storageService,
    imageRepository: imageStorageService,
    eventPublisher: eventPublisherService,
    idGenerator: () => `img_${Date.now()}_${uuidv4().substring(0, 8)}`
});

const processImage = createProcessImageHandler({
    imageRepository: imageStorageService,
    publishStatusChanged: publishImageStatusChanged
});

const getImageStatus = createGetImageStatusHandler({
    imageRepository: imageStorageService
});

module.exports = { uploadImage, processImage, getImageStatus };