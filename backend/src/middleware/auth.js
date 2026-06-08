const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.AUTH_SECRET);
    req.user = { id: payload.sub || payload.id };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
