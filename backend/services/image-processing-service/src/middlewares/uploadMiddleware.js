const multer = require('multer');
const { env } = require('../config/env');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (env.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`Tipo de arquivo '${file.mimetype}' não suportado. Formatos válidos: ${env.allowedMimeTypes.join(', ')}`);
    error.status = 400;
    error.code = 'INVALID_MIME_TYPE';
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxFileSizeMb * 1024 * 1024 // 10MB default
  }
});

// Aceita campos comuns: 'image', 'file', 'photo'
const uploadImageMiddleware = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          error: 'FILE_TOO_LARGE',
          message: `O arquivo enviado excede o limite máximo permitido de ${env.maxFileSizeMb}MB.`
        });
      }
      return res.status(400).json({
        success: false,
        error: 'UPLOAD_ERROR',
        message: err.message
      });
    } else if (err) {
      return res.status(err.status || 400).json({
        success: false,
        error: err.code || 'BAD_REQUEST',
        message: err.message
      });
    }

    // Se um arquivo foi enviado via form-data, padroniza req.file
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }

    next();
  });
};

module.exports = { uploadImageMiddleware };
