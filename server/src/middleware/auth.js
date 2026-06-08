const { AuthService } = require('../services/authService');
const { parseCookies } = require('../utils/cookies');

module.exports = async function authMiddleware(req, res, next) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const user = await AuthService.getUserFromToken(cookies.webnovel_auth);

    if (!user) {
      res.status(401).json({ success: false, data: null, error: 'Not signed in' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
