const express = require('express');
const searchController = require('../controllers/searchController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', searchController.searchNovels);

module.exports = router;
