/**
 * 认证路由
 */
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { generateToken, authRequired } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ code: 400, msg: '请输入用户名和密码' });

  const user = db.prepare('SELECT id, username, nickname, phone, role FROM users WHERE username=? AND password=? AND status=?')
    .get(username, password, 'active');

  if (!user) return res.status(401).json({ code: 401, msg: '用户名或密码错误' });

  const token = generateToken(user);
  res.json({ code: 200, data: { token, user } });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, password, nickname, phone } = req.body;

  if (!username || !password) return res.status(400).json({ code: 400, msg: '用户名和密码不能为空' });
  if (username.length < 3) return res.status(400).json({ code: 400, msg: '用户名至少3个字符' });
  if (password.length < 6) return res.status(400).json({ code: 400, msg: '密码至少6个字符' });

  // 检查用户名是否已存在
  const existing = db.prepare('SELECT id FROM users WHERE username=?').get(username);
  if (existing) return res.status(400).json({ code: 400, msg: '用户名已存在，请换一个' });

  const stmt = db.prepare('INSERT INTO users (username, password, nickname, phone, role, status) VALUES (?,?,?,?,?,?)');
  stmt.run(username, password, nickname || username, phone || '', 'customer', 'active');
  db.save();

  const user = db.prepare('SELECT id, username, nickname, phone, role FROM users WHERE username=?').get(username);
  const token = generateToken(user);
  res.json({ code: 200, msg: '注册成功', data: { token, user } });
});

// GET /api/auth/me
router.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT id, username, nickname, phone, role FROM users WHERE id=?').get(req.user.id);
  res.json({ code: 200, data: user });
});

module.exports = router;
