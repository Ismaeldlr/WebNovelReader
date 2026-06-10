const express = require('express');
const historyController = require('../controllers/historyController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', historyController.getHistory);
router.get('/stats', historyController.getStats);
router.get('/novels', historyController.getNovels);
router.get('/by-novel', historyController.getNovelHistory);

module.exports = router;
