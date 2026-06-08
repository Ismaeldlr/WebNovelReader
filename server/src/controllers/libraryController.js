const LibraryService = require('../services/libraryService');

exports.getLibrary = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const {
      status, sourceSite, onlyFavorites, onlyUnread, search,
      sortBy, order, limit = 24, offset = 0
    } = req.query;

    const result = await LibraryService.getUserLibrary(userId, {
      status,
      sourceSite,
      onlyFavorites: onlyFavorites === 'true',
      onlyUnread: onlyUnread === 'true',
      search: search || '',
      sortBy: sortBy || 'lastReadAt',
      order: (order && order.toUpperCase() === 'ASC') ? 'ASC' : 'DESC',
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    res.json({ success: true, data: result, error: null });
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const stats = await LibraryService.getLibraryStats(userId);
    res.json({ success: true, data: stats, error: null });
  } catch (err) {
    next(err);
  }
};

exports.getNewChaptersCount = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const count = await LibraryService.getUnseenNewChaptersCount(userId);
    res.json({ success: true, data: { count }, error: null });
  } catch (err) {
    next(err);
  }
};

exports.toggleFavorite = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { novelId } = req.params;
    const result = await LibraryService.toggleFavorite(userId, novelId);
    res.json({ success: true, data: result, error: null });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { novelId } = req.params;
    const { status } = req.body;
    if (!status) throw new Error('Status is required');
    const result = await LibraryService.updateStatus(userId, novelId, status);
    res.json({ success: true, data: result, error: null });
  } catch (err) {
    next(err);
  }
};

exports.deleteNovel = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { novelId } = req.params;
    await LibraryService.deleteNovel(userId, novelId);
    res.json({ success: true, data: null, error: null });
  } catch (err) {
    next(err);
  }
};