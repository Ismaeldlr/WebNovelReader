const ExploreService = require('../services/exploreService');

exports.getNovels = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '24', 10), 48);
    const novels = await ExploreService.getNovels(req.user.id, {
      search: req.query.search || '',
      limit: Number.isNaN(limit) ? 24 : limit,
    });

    res.json({ success: true, data: { novels }, error: null });
  } catch (err) {
    next(err);
  }
};
