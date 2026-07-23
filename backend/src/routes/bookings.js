/**
 * 订单 API
 */
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authRequired } = require('../middleware/auth');

// 生成订单号
function genOrderNo() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `B2B${y}${m}${d}${rand}`;
}

// POST /api/bookings - 创建订单
router.post('/', authRequired, (req, res) => {
  const { hotel_id, room_type_id, check_in, check_out, room_count = 1, guest_name, guest_phone, remark, source = 'manual', price_type = 'direct' } = req.body;

  if (!hotel_id || !room_type_id || !check_in || !check_out) {
    return res.status(400).json({ code: 400, msg: '缺少必填字段：hotel_id, room_type_id, check_in, check_out' });
  }

  const hotel = db.prepare('SELECT * FROM hotels WHERE id=?').get(hotel_id);
  if (!hotel) return res.status(404).json({ code: 404, msg: '酒店不存在' });

  const room = db.prepare('SELECT * FROM room_types WHERE id=? AND hotel_id=?').get(room_type_id, hotel_id);
  if (!room) return res.status(404).json({ code: 404, msg: '房型不存在或不属于该酒店' });

  // 校验最低起订数（团房）
  const rc = parseInt(room_count);
  const minRooms = room.min_rooms || 1;
  if (rc < minRooms) {
    return res.status(400).json({ code: 400, msg: `该房型为团房，最低${minRooms}间起订` });
  }

  // 计算晚数和总价
  const ci = new Date(check_in + 'T00:00:00');
  const co = new Date(check_out + 'T00:00:00');
  const nights = Math.round((co - ci) / (1000 * 60 * 60 * 24));
  if (nights <= 0) return res.status(400).json({ code: 400, msg: '退房日期必须晚于入住日期' });

  let unitPrice = 0;
  if (price_type === 'direct') {
    const prices = [];
    for (let i = 0; i < nights; i++) {
      const d = new Date(ci); d.setDate(d.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      const p = db.prepare('SELECT sales_price FROM direct_prices WHERE room_type_id=? AND date=?').get(room_type_id, ds);
      prices.push(p?.sales_price || 0);
    }
    unitPrice = Math.round(prices.reduce((a, b) => a + b, 0) / nights);
    if (prices.some(p => p === 0)) return res.status(400).json({ code: 400, msg: '所选日期没有直签价格数据' });
  } else {
    const prices = [];
    for (let i = 0; i < nights; i++) {
      const d = new Date(ci); d.setDate(d.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      const p = db.prepare('SELECT ota_price FROM ota_prices WHERE room_type_id=? AND date=? AND ota_source=? LIMIT 1').get(room_type_id, ds, source === 'ctrip' ? 'ctrip' : 'booking');
      prices.push(p?.ota_price || 0);
    }
    unitPrice = Math.round(prices.reduce((a, b) => a + b, 0) / nights);
    if (prices.some(p => p === 0)) return res.status(400).json({ code: 400, msg: '所选日期没有OTA价格数据' });
  }

  const totalPrice = unitPrice * room_count * nights;

  // 检查库存
  for (let i = 0; i < nights; i++) {
    const d = new Date(ci); d.setDate(d.getDate() + i);
    const ds = d.toISOString().split('T')[0];
    const inv = db.prepare('SELECT * FROM inventory WHERE room_type_id=? AND date=?').get(room_type_id, ds);
    if (!inv || inv.total_rooms - inv.booked_rooms < room_count) {
      return res.status(400).json({ code: 400, msg: `${ds} 库存不足，可用${inv ? inv.total_rooms - inv.booked_rooms : 0}间` });
    }
  }

  // 创建订单 + 扣减库存
  const orderNo = genOrderNo();

  const createOrder = db.transaction(() => {
    db.prepare(`INSERT INTO orders (order_no, hotel_id, room_type_id, check_in, check_out, nights, room_count, unit_price, total_price, price_type, guest_name, guest_phone, remark, source, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(orderNo, hotel_id, room_type_id, check_in, check_out, nights, room_count, unitPrice, totalPrice, price_type, guest_name, guest_phone, remark, source, req.user.id);

    for (let i = 0; i < nights; i++) {
      const d = new Date(ci); d.setDate(d.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      db.prepare('UPDATE inventory SET booked_rooms=booked_rooms+?, status=CASE WHEN total_rooms-booked_rooms-?<=0 THEN ? ELSE status END, updated_at=datetime(?,?,?) WHERE room_type_id=? AND date=?')
        .run(room_count, room_count, 'full', 'now', 'localtime', room_type_id, ds);
    }
  });

  createOrder();

  const order = db.prepare('SELECT * FROM orders WHERE order_no=?').get(orderNo);
  res.json({ code: 200, data: order });
});

// GET /api/bookings - 订单列表
router.get('/', authRequired, (req, res) => {
  const { hotel_id, status, source, page = 1, pageSize = 20 } = req.query;
  let sql = 'SELECT o.*, h.name_cn as hotel_name, r.name_cn as room_name FROM orders o LEFT JOIN hotels h ON o.hotel_id=h.id LEFT JOIN room_types r ON o.room_type_id=r.id WHERE 1=1';
  const params = [];

  if (hotel_id) { sql += ' AND o.hotel_id=?'; params.push(parseInt(hotel_id)); }
  if (status) { sql += ' AND o.status=?'; params.push(status); }
  if (source) { sql += ' AND o.source=?'; params.push(source); }

  const countSql = sql.replace(/SELECT .*? FROM/, 'SELECT COUNT(*) as total FROM');
  const total = db.prepare(countSql).get(...params).total;

  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

  const list = db.prepare(sql).all(...params);
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

// GET /api/bookings/:id - 订单详情
router.get('/:id', authRequired, (req, res) => {
  const order = db.prepare('SELECT o.*, h.name_cn as hotel_name, r.name_cn as room_name FROM orders o LEFT JOIN hotels h ON o.hotel_id=h.id LEFT JOIN room_types r ON o.room_type_id=r.id WHERE o.id=?').get(parseInt(req.params.id));
  if (!order) return res.status(404).json({ code: 404, msg: '订单不存在' });
  res.json({ code: 200, data: order });
});

// PUT /api/bookings/:id/cancel - 取消订单
router.put('/:id/cancel', authRequired, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(parseInt(req.params.id));
  if (!order) return res.status(404).json({ code: 404, msg: '订单不存在' });
  if (order.status === 'cancelled') return res.status(400).json({ code: 400, msg: '订单已取消' });

  const ci = new Date(order.check_in + 'T00:00:00');

  const cancelOrder = db.transaction(() => {
    db.prepare('UPDATE orders SET status=?, updated_at=datetime(?,?,?) WHERE id=?').run('cancelled', 'now', 'localtime', order.id);

    for (let i = 0; i < order.nights; i++) {
      const d = new Date(ci); d.setDate(d.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      db.prepare('UPDATE inventory SET booked_rooms=MAX(0,booked_rooms-?), status=CASE WHEN total_rooms-booked_rooms+?>0 THEN ? ELSE status END, updated_at=datetime(?,?,?) WHERE room_type_id=? AND date=?')
        .run(order.room_count, order.room_count, 'open', 'now', 'localtime', order.room_type_id, ds);
    }
  });

  cancelOrder();
  res.json({ code: 200, msg: '订单已取消' });
});

// GET /api/bookings/stats/summary - 订单统计
router.get('/stats/summary', authRequired, (req, res) => {
  const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const confirmed = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status='confirmed'").get().c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status='completed'").get().c;
  const revenue = db.prepare("SELECT COALESCE(SUM(total_price),0) as c FROM orders WHERE status IN ('confirmed','completed')").get().c;

  res.json({ code: 200, data: { total_orders: totalOrders, confirmed, completed, total_revenue: revenue } });
});

module.exports = router;
