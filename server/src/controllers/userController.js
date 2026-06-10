const UserService = require('../services/userService');

exports.getProfile = async (req, res, next) => {
  try {
    const profile = await UserService.getProfile(req.user.id);
    res.json({ success: true, data: profile, error: null });
  } catch (err) {
    next(err);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    await UserService.updatePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword
    );
    res.json({ success: true, data: { updated: true }, error: null });
  } catch (err) {
    next(err);
  }
};

exports.updateReaderPreferences = async (req, res, next) => {
  try {
    const preferences = await UserService.updateReaderPreferences(req.user.id, req.body);
    res.json({ success: true, data: preferences, error: null });
  } catch (err) {
    next(err);
  }
};
