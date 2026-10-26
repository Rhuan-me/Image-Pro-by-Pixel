const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/authenticate.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { updateProfileSchema } = require('../schemas/update-profile.schema');

const router = express.Router();

router.use(authenticate);

router.get('/me', userController.getMe);

router.put(
  '/me',
  validate(updateProfileSchema),
  userController.updateMe
);

module.exports = router;