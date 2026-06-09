const ImportService = require('../services/importService');

exports.importEpub = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, data: null, error: 'EPUB file is required.' });
      return;
    }

    const result = await ImportService.importEpub(req.user.id, req.file);
    res.status(201).json({ success: true, data: result, error: null });
  } catch (err) {
    next(err);
  }
};

exports.getRecentImports = async (req, res, next) => {
  try {
    const imports = await ImportService.getRecentImports(req.user.id);
    res.json({ success: true, data: imports, error: null });
  } catch (err) {
    next(err);
  }
};
