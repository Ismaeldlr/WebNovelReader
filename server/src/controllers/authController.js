const { AuthService, TOKEN_TTL_MS } = require('../services/authService');
const { parseCookies, setAuthCookie, clearAuthCookie } = require('../utils/cookies');

function sendAuth(res, result) {
  setAuthCookie(res, result.token, TOKEN_TTL_MS);
  res.json({ success: true, data: { user: result.user }, error: null });
}

exports.register = async (req, res, next) => {
  try {
    const result = await AuthService.register(req.body.username, req.body.password);
    sendAuth(res, result);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const result = await AuthService.login(req.body.username, req.body.password);
    sendAuth(res, result);
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const user = await AuthService.getUserFromToken(cookies.webnovel_auth);
    if (!user) {
      res.status(401).json({ success: false, data: null, error: 'Not signed in' });
      return;
    }
    res.json({ success: true, data: { user }, error: null });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, data: null, error: null });
};
