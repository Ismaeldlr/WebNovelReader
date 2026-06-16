const ImportService = require('../services/importService');
const JobService = require('../services/jobService');

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

exports.importUrl = async (req, res, next) => {
  try {
    const job = await JobService.createUrlImportJob(req.user.id, req.body);
    res.status(202).json({ success: true, data: job, error: null });
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
