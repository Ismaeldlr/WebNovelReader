const JobService = require('../services/jobService');

exports.getJob = async (req, res, next) => {
  try {
    const job = await JobService.getJobStatus(req.user.id, req.params.id);
    res.json({ success: true, data: job, error: null });
  } catch (err) {
    next(err);
  }
};
