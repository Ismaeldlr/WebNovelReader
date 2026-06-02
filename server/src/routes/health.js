const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ success: true, data: { status: 'ok' }, error: null });
});

module.exports = router;