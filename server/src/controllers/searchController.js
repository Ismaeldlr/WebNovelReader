const SearchService = require('../services/searchService');

exports.searchNovels = async (req, res, next) => {
  try {
    const results = await SearchService.searchNovels(req.user.id, {
      query: req.query.q || '',
      limit: req.query.limit || 5,
    });

    res.json({ success: true, data: { results }, error: null });
  } catch (err) {
    next(err);
  }
};
