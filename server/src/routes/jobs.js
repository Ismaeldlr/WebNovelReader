const express = require('express');
const jobController = require('../controllers/jobController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/:id', jobController.getJob);

module.exports = router;
