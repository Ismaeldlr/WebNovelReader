const NovelService = require('../services/novelService');
const fs = require('fs/promises');

exports.getNovelDetail = async (req, res, next) => {
  try {
    const novel = await NovelService.getNovelDetail(req.params.id, req.user.id);

    if (!novel) {
      res.status(404).json({ success: false, data: null, error: 'Novel not found' });
      return;
    }

    res.json({ success: true, data: novel, error: null });
  } catch (err) {
    next(err);
  }
};

exports.getNovelChapters = async (req, res, next) => {
  try {
    const result = await NovelService.getNovelChapters(req.params.id, req.user.id, {
      page: req.query.page,
      limit: req.query.limit,
      order: req.query.order,
    });

    res.json({ success: true, data: result, error: null });
  } catch (err) {
    next(err);
  }
};

exports.updateNovel = async (req, res, next) => {
  try {
    const novel = await NovelService.updateNovel(req.params.id, req.user.id, req.body);
    res.json({ success: true, data: novel, error: null });
  } catch (err) {
    next(err);
  }
};

exports.updateCover = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, data: null, error: 'Cover image is required.' });
      return;
    }

    const coverUrl = await NovelService.updateCover(req.params.id, req.file);
    res.json({ success: true, data: { cover_url: coverUrl }, error: null });
  } catch (err) {
    if (req.file?.path) {
      await fs.rm(req.file.path, { force: true }).catch(() => undefined);
    }
    next(err);
  }
};
