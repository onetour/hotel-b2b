/**
 * 库存管理 API
 */
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authRequired, adminRequired } = require('../middleware/auth');

// GET /api/inventory/alerts - 低库存预警
router.get('/alerts', authRequired, (req, res) => {
  const { threshold = 5, hotel_id, date } = req.query;
  let sql = `SELECT i.*, r.name_cn as room_name, h.name_cn as hotel_name, h.id as hotel_id
    FROM inventory i
    LEFT JOIN room_types r ON i.room_type_id=r.id
    LEFT JOIN hotels h ON r.hotel_id=h.id
    WHERE (i.total_rooms - i.booked_rooms) <= ?`;
  const params = [parseInt(threshold)];

  if (hotel_id) { sql += ' AND h.id=?'; params.push(parseInt(hotel_id)); }
  if (date) { sql += ' AND i.date=?'; params.push(date); }

  sql += ' ORDER BY (i.total_rooms - i.booked_rooms) ASC, i.date ASC';

  const list = db.prepare(sql).all(...params);
  const result = list.map(i => ({
    ...i,
    available_rooms: Math.max(0, i.total_rooms - i.booked_rooms)
  }));

  res.json({ code: 200, data: { threshold: parseInt(threshold), total: result.length, alerts: result } });
});

// PUT /api/inventory/update - 更新单个库存
router.put('/update', authRequired, (req, res) => {
  const { room_type_id, date, total_rooms, booked_rooms } = req.body;
  if (!room_type_id || !date) return res.status(400).json({ code: 400, msg: '缺少必填字段' });

  const existing = db.prepare('SELECT * FROM inventory WHERE room_type_id=? AND date=?').get(room_type_id, date);

  if (existing) {
    db.prepare('UPDATE inventory SET total_rooms=COALESCE(?,total_rooms), booked_rooms=COALESCE(?,booked_rooms), status=CASE WHEN COALESCE(?,total_rooms)-COALESCE(?,booked_rooms)<=0 THEN ? ELSE ? END, updated_at=datetime(?,?,?) WHERE room_type_id=? AND date=?')
      .run(total_rooms ?? null, booked_rooms ?? null, total_rooms ?? null, booked_rooms ?? null, 'full', 'open', 'now', 'localtime', room_type_id, date);
  } else {
    const room = db.prepare('SELECT * FROM room_types WHERE id=?').get(room_type_id);
    if (!room) return res.status(404).json({ code: 404, msg: '房型不存在' });
    db.prepare('INSERT INTO inventory (room_type_id, date, total_rooms, booked_rooms, status) VALUES (?,?,?,?,?)')
      .run(room_type_id, date, total_rooms || 10, booked_rooms || 0, (booked_rooms || 0) >= (total_rooms || 10) ? 'full' : 'open');
  }

  const updated = db.prepare('SELECT * FROM inventory WHERE room_type_id=? AND date=?').get(room_type_id, date);
  res.json({ code: 200, data: { ...updated, available_rooms: Math.max(0, updated.total_rooms - updated.booked_rooms) } });
});

// PUT /api/inventory/batch - 批量更新库存
router.put('/batch', adminRequired, (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) return res.status(400).json({ code: 400, msg: '请提供items数组' });

  const updateInv = db.transaction(() => {
    let count = 0;
    for (const item of items) {
      if (!item.room_type_id || !item.date) continue;
      db.prepare(`INSERT INTO inventory (room_type_id, date, total_rooms, booked_rooms, status)
        VALUES (?,?,?,?,?)
        ON CONFLICT(room_type_id, date) DO UPDATE SET
        total_rooms=excluded.total_rooms, booked_rooms=excluded.booked_rooms,
        status=excluded.status, updated_at=datetime('now','localtime')`)
        .run(item.room_type_id, item.date, item.total_rooms, item.booked_rooms || 0, (item.booked_rooms || 0) >= item.total_rooms ? 'full' : 'open');
      count++;
    }
    return count;
  });

  const count = updateInv();
  res.json({ code: 200, msg: `已更新${count}条库存记录` });
});

module.exports = router;
