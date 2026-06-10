const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/profile', userController.getProfile);
router.patch('/password', userController.updatePassword);
router.patch('/preferences', userController.updateReaderPreferences);

module.exports = router;
