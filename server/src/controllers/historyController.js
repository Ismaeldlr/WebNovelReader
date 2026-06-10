const HistoryService = require('../services/historyService');

exports.getHistory = async (req, res, next) => {
  try {
    const result = await HistoryService.getHistory(req.user.id, {
      page: req.query.page || 1,
      limit: req.query.limit || 30,
      novelId: req.query.novelId || '',
      from: req.query.from || '',
    });

    res.json({ success: true, data: result, error: null });
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const stats = await HistoryService.getStats(req.user.id);
    res.json({ success: true, data: stats, error: null });
  } catch (err) {
    next(err);
  }
};

exports.getNovels = async (req, res, next) => {
  try {
    const novels = await HistoryService.getNovels(req.user.id);
    res.json({ success: true, data: { novels }, error: null });
  } catch (err) {
    next(err);
  }
};

exports.getNovelHistory = async (req, res, next) => {
  try {
    const novels = await HistoryService.getNovelHistory(req.user.id, {
      novelId: req.query.novelId || '',
      from: req.query.from || '',
    });

    res.json({ success: true, data: { novels }, error: null });
  } catch (err) {
    next(err);
  }
};
