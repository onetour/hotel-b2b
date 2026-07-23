/**
 * JWT 认证中间件
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'hotel_b2b_secret_key_2026';
const JWT_EXPIRES = '24h';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, nickname: user.nickname },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// Express 中间件：需要登录
function authRequired(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (!token) return res.status(401).json({ code: 401, msg: '请先登录' });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ code: 401, msg: 'Token无效或已过期' });
  req.user = user;
  next();
}

// Express 中间件：需要管理员权限
function adminRequired(req, res, next) {
  authRequired(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ code: 403, msg: '需要管理员权限' });
    next();
  });
}

// Express 中间件：可选登录（用于小程序等场景）
function authOptional(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (token) {
    const user = verifyToken(token);
    if (user) req.user = user;
  }
  next();
}

module.exports = { JWT_SECRET, generateToken, verifyToken, authRequired, adminRequired, authOptional };
