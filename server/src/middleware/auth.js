// server/src/middleware/auth.js
module.exports = function authMiddleware(req, res, next) {
  // For development, accept a header. In production, use session/JWT.
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Missing user ID', data: null });
  }
  req.user = { id: userId };
  next();
};