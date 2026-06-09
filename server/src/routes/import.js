const express = require('express');
const multer = require('multer');
const importController = require('../controllers/importController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const hasEpubName = /\.epub$/i.test(file.originalname || '');
    const hasEpubMime = ['application/epub+zip', 'application/octet-stream'].includes(file.mimetype);

    if (hasEpubName || hasEpubMime) {
      cb(null, true);
      return;
    }

    cb(new Error('Please choose a valid EPUB file.'));
  },
});

router.use(authMiddleware);

router.post('/epub', upload.single('file'), importController.importEpub);
router.get('/recent', importController.getRecentImports);

module.exports = router;
