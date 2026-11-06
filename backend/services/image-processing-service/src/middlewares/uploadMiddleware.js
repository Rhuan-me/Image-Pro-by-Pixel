const multer = require('multer');
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de arquivo inválido. Apenas JPEG, PNG e WEBP são permitidos.'), false);
  }
};
const uploadMiddleware = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});
module.exports = uploadMiddleware;
