/**
 * 用户管理路由 - 管理员专用
 */
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { adminRequired } = require('../middleware/auth');

// GET /api/users - 获取用户列表
router.get('/', adminRequired, (req, res) => {
  const { page = 1, pageSize = 50, keyword, role, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = [];
  let params = [];
  if (keyword) { where.push('(username LIKE ? OR nickname LIKE ? OR phone LIKE ?)'); params.push('%'+keyword+'%', '%'+keyword+'%', '%'+keyword+'%'); }
  if (role) { where.push('role = ?'); params.push(role); }
  if (status) { where.push('status = ?'); params.push(status); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const count = db.prepare(`SELECT COUNT(*) as c FROM users ${whereClause}`).get(...params).c;
  const list = db.prepare(
    `SELECT id, username, nickname, phone, role, status, created_at FROM users ${whereClause} ORDER BY id LIMIT ? OFFSET ?`
  ).all(...params, parseInt(pageSize), offset);

  res.json({ code: 200, data: { list, total: count, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

// POST /api/users - 创建用户
router.post('/', adminRequired, (req, res) => {
  const { username, password, nickname, phone, role } = req.body;
  if (!username || !password) return res.status(400).json({ code: 400, msg: '用户名和密码不能为空' });
  if (username.length < 3) return res.status(400).json({ code: 400, msg: '用户名至少3个字符' });
  if (password.length < 6) return res.status(400).json({ code: 400, msg: '密码至少6个字符' });

  const exist = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exist) return res.status(400).json({ code: 400, msg: '用户名已存在' });

  const validRoles = ['admin', 'manager', 'staff'];
  const userRole = validRoles.includes(role) ? role : 'staff';

  db.prepare(
    'INSERT INTO users (username, password, nickname, phone, role, status, created_at) VALUES (?,?,?,?,?,?,datetime("now"))'
  ).run(username, password, nickname || username, phone || '', userRole, 'active');

  const lid = db.prepare('SELECT last_insert_rowid() as id').get();
  res.json({ code: 200, msg: '用户创建成功', data: { id: lid.id } });
});

// PUT /api/users/:id - 编辑用户信息
router.put('/:id', adminRequired, (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ code: 404, msg: '用户不存在' });

  // 不允许修改自己的角色和状态
  if (Number(id) === req.user.id) {
    return res.status(400).json({ code: 400, msg: '不能修改自己的账号信息' });
  }

  const { nickname, phone, role, status } = req.body;
  const updates = [];
  const params = [];

  if (nickname !== undefined) { updates.push('nickname = ?'); params.push(nickname); }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
  if (role && ['admin', 'manager', 'staff'].includes(role)) { updates.push('role = ?'); params.push(role); }
  if (status && ['active', 'inactive'].includes(status)) { updates.push('status = ?'); params.push(status); }

  if (!updates.length) return res.status(400).json({ code: 400, msg: '没有需要更新的字段' });

  params.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  db.save();

  res.json({ code: 200, msg: '用户信息已更新' });
});

// PUT /api/users/:id/password - 重置密码
router.put('/:id/password', adminRequired, (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ code: 404, msg: '用户不存在' });

  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ code: 400, msg: '密码至少6个字符' });

  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(password, id);
  db.save();

  res.json({ code: 200, msg: '密码已重置' });
});

// DELETE /api/users/:id - 删除用户
router.delete('/:id', adminRequired, (req, res) => {
  const { id } = req.params;

  if (Number(id) === req.user.id) {
    return res.status(400).json({ code: 400, msg: '不能删除自己的账号' });
  }

  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ code: 404, msg: '用户不存在' });

  // 检查是否是最后一个管理员
  if (user.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='admin' AND status='active'").get().c;
    if (adminCount <= 1) return res.status(400).json({ code: 400, msg: '不能删除最后一个管理员' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  db.save();

  res.json({ code: 200, msg: '用户已删除' });
});

module.exports = router;
