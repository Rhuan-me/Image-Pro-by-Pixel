
const express = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');
const { registerSchema } = require('../schemas/register.schema');

const router = express.Router();

router.post(
  '/register',
  validate(registerSchema),
  authController.register
);

module.exports = router;
