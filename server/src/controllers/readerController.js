const ReaderService = require('../services/readerService');

exports.getChapter = async (req, res, next) => {
  try {
    const chapter = await ReaderService.getChapter(
      req.params.novelId,
      req.params.chapterNumber,
      req.user.id
    );

    res.json({ success: true, data: chapter, error: null });
  } catch (err) {
    next(err);
  }
};

exports.markChapterRead = async (req, res, next) => {
  try {
    await ReaderService.markChapterRead(
      req.params.novelId,
      req.params.chapterNumber,
      req.user.id
    );

    res.json({ success: true, data: { ok: true }, error: null });
  } catch (err) {
    next(err);
  }
};
