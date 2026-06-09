const express = require('express');
const readerController = require('../controllers/readerController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/:novelId/chapters/:chapterNumber', readerController.getChapter);
router.post('/:novelId/chapters/:chapterNumber/read', readerController.markChapterRead);

module.exports = router;
