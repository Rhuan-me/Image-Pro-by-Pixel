const express = require('express');
const imageController = require('../controllers/imageController');
const { uploadImageMiddleware } = require('../middlewares/uploadMiddleware');

const router = express.Router();

/**
 * Rota principal de upload de imagem:
 * POST /api/images/upload
 */
router.post('/upload', uploadImageMiddleware, (req, res, next) => imageController.upload(req, res, next));

/**
 * Consulta de imagem por ID:
 * GET /api/images/:id
 */
router.get('/:id', (req, res, next) => imageController.getById(req, res, next));

module.exports = router;
