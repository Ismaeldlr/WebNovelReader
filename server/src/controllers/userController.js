const UserService = require('../services/userService');

exports.updateReaderPreferences = async (req, res, next) => {
  try {
    const preferences = await UserService.updateReaderPreferences(req.user.id, req.body);
    res.json({ success: true, data: preferences, error: null });
  } catch (err) {
    next(err);
  }
};
