const express = require('express');
const exploreController = require('../controllers/exploreController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', exploreController.getNovels);

module.exports = router;
