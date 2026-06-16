const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const novelController = require('../controllers/novelController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const coversDir = path.join(__dirname, '..', '..', 'public', 'covers');

const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(coversDir, { recursive: true });
    cb(null, coversDir);
  },
  filename: (req, file, cb) => {
    const extensionByMime = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    cb(null, `${req.params.id}${extensionByMime[file.mimetype] || path.extname(file.originalname).toLowerCase()}`);
  },
});

const coverUpload = multer({
  storage: coverStorage,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    const error = new Error('Cover must be a JPG, PNG, or WEBP image.');
    error.status = 400;
    cb(error);
  },
});

router.use(authMiddleware);

router.patch('/:id', novelController.updateNovel);
router.post('/:id/cover', coverUpload.single('cover'), novelController.updateCover);
router.delete('/:id', novelController.deleteNovel);
router.get('/:id', novelController.getNovelDetail);
router.get('/:id/chapters', novelController.getNovelChapters);

module.exports = router;
