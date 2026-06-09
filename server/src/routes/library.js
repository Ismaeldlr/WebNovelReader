const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', libraryController.getLibrary);
router.get('/stats', libraryController.getStats);
router.get('/new-chapters-count', libraryController.getNewChaptersCount);
router.post('/:novelId', libraryController.addNovel);
router.patch('/:novelId/favorite', libraryController.toggleFavorite);
router.patch('/:novelId/status', libraryController.updateStatus);
router.delete('/:novelId', libraryController.deleteNovel);

module.exports = router;
