/**
 * 酒店查询 + 价格对比 API
 */
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authRequired } = require('../middleware/auth');

// ==================== 酒店列表 ====================

// GET /api/hotels - 酒店搜索
router.get('/', (req, res) => {
  const { keyword, star_rating, source, page = 1, pageSize = 50 } = req.query;
  let sql = 'SELECT * FROM hotels WHERE status=?';
  const params = ['active'];

  if (keyword) {
    sql += ' AND (name LIKE ? OR name_cn LIKE ? OR address_cn LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (star_rating) { sql += ' AND star_rating=?'; params.push(parseInt(star_rating)); }
  if (source) { sql += ' AND source=?'; params.push(source); }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;

  sql += ' ORDER BY star_rating DESC, id ASC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

  const list = db.prepare(sql).all(...params);
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

// ==================== 全局搜索（必须在 :id 路由之前） ====================

// GET /api/hotels/search/prices - 多酒店价格对比搜索
router.get('/search/prices', (req, res) => {
  const { keyword, date, star_rating, source } = req.query;
  const checkDate = date || new Date().toISOString().split('T')[0];

  let hotelSql = 'SELECT * FROM hotels WHERE status=?';
  const params = ['active'];
  if (keyword) { hotelSql += ' AND (name LIKE ? OR name_cn LIKE ? OR address_cn LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
  if (star_rating) { hotelSql += ' AND star_rating=?'; params.push(parseInt(star_rating)); }
  if (source) { hotelSql += ' AND source=?'; params.push(source); }

  const hotels = db.prepare(hotelSql).all(...params);
  const results = [];

  for (const hotel of hotels) {
    const rooms = db.prepare('SELECT id, name_cn, bed_type, max_guests, meal_plan, min_rooms FROM room_types WHERE hotel_id=? AND status=?').all(hotel.id, 'active');
    const roomResults = [];
    for (const room of rooms) {
      const minRooms = room.min_rooms || 1;
      const direct = db.prepare('SELECT contract_price, sales_price FROM direct_prices WHERE room_type_id=? AND date=?').get(room.id, checkDate);
      const ctrip = db.prepare('SELECT ota_price FROM ota_prices WHERE room_type_id=? AND date=? AND ota_source=?').get(room.id, checkDate, 'ctrip');
      const booking = db.prepare('SELECT ota_price FROM ota_prices WHERE room_type_id=? AND date=? AND ota_source=?').get(room.id, checkDate, 'booking');
      const inv = db.prepare('SELECT total_rooms, booked_rooms FROM inventory WHERE room_type_id=? AND date=?').get(room.id, checkDate);

      roomResults.push({
        room_type_id: room.id, room_name: room.name_cn, bed_type: room.bed_type,
        min_rooms: minRooms,
        direct: direct || null,
        ota: { ctrip: ctrip?.ota_price || null, booking: booking?.ota_price || null },
        available_rooms: inv ? Math.max(0, inv.total_rooms - inv.booked_rooms) : 0
      });
    }
    results.push({ hotel_id: hotel.id, hotel_name: hotel.name_cn, star_rating: hotel.star_rating, source: hotel.source, address_cn: hotel.address_cn, rooms: roomResults });
  }

  res.json({ code: 200, data: { date: checkDate, hotels: results } });
});

// ==================== 酒店详情 ====================

// GET /api/hotels/:id - 酒店详情 + 房型列表
router.get('/:id', (req, res) => {
  const hotelId = parseInt(req.params.id);
  if (isNaN(hotelId)) return res.status(404).json({ code: 404, msg: '无效的酒店ID' });
  const hotel = db.prepare('SELECT * FROM hotels WHERE id=? AND status=?').get(hotelId, 'active');
  if (!hotel) return res.status(404).json({ code: 404, msg: '酒店不存在' });

  const rooms = db.prepare('SELECT * FROM room_types WHERE hotel_id=? AND status=?').all(hotel.id, 'active');
  res.json({ code: 200, data: { ...hotel, rooms } });
});

// ==================== 价格对比（核心功能） ====================

// GET /api/hotels/:id/prices - 单酒店价格查询（OTA价 vs 直签价对比）
router.get('/:id/prices', (req, res) => {
  const hotelId = parseInt(req.params.id);
  const hotel = db.prepare('SELECT * FROM hotels WHERE id=?').get(hotelId);
  if (!hotel) return res.status(404).json({ code: 404, msg: '酒店不存在' });

  const { from, to, room_type_id } = req.query;
  let dateFrom = from, dateTo = to;
  if (!dateFrom) { const d = new Date(); dateFrom = d.toISOString().split('T')[0]; }
  if (!dateTo) { const d = new Date(); d.setDate(d.getDate() + 7); dateTo = d.toISOString().split('T')[0]; }

  const rooms = db.prepare('SELECT id, name_cn, bed_type, area, max_guests, meal_plan, min_rooms FROM room_types WHERE hotel_id=? AND status=? ORDER BY id').all(hotelId, 'active');

  const results = [];
  for (const room of rooms) {
    const minRooms = room.min_rooms || 1;
    if (room_type_id && room.id !== parseInt(room_type_id)) continue;

    // 直签价
    const directPrices = db.prepare('SELECT date, contract_price, sales_price, tag FROM direct_prices WHERE room_type_id=? AND date>=? AND date<=? ORDER BY date').all(room.id, dateFrom, dateTo);

    // OTA价
    const otaPrices = db.prepare('SELECT date, ota_price, ota_source, available_rooms FROM ota_prices WHERE room_type_id=? AND date>=? AND date<=? ORDER BY date').all(room.id, dateFrom, dateTo);

    // 库存
    const inventory = db.prepare('SELECT date, total_rooms, booked_rooms, status FROM inventory WHERE room_type_id=? AND date>=? AND date<=? ORDER BY date').all(room.id, dateFrom, dateTo);

    results.push({
      room_type_id: room.id, room_name: room.name_cn, bed_type: room.bed_type,
      max_guests: room.max_guests, meal_plan: room.meal_plan,
      min_rooms: minRooms,
      direct: directPrices,
      ota: otaPrices.reduce((acc, p) => {
        if (!acc[p.date]) acc[p.date] = {};
        acc[p.date][p.ota_source] = { ota_price: p.ota_price, available_rooms: p.available_rooms };
        return acc;
      }, {}),
      inventory: inventory.reduce((acc, i) => { acc[i.date] = i; return acc; }, {})
    });
  }

  res.json({ code: 200, data: { hotel_id: hotelId, hotel_name: hotel.name_cn, date_range: { from: dateFrom, to: dateTo }, rooms: results } });
});

// GET /api/hotels/:id/compare - 简版价格对比（适合小程序/快速查看）
router.get('/:id/compare', (req, res) => {
  const hotelId = parseInt(req.params.id);
  const hotel = db.prepare('SELECT * FROM hotels WHERE id=?').get(hotelId);
  if (!hotel) return res.status(404).json({ code: 404, msg: '酒店不存在' });

  const { date } = req.query;
  const checkDate = date || new Date().toISOString().split('T')[0];

  const rooms = db.prepare('SELECT id, name_cn, bed_type, area, max_guests, meal_plan, min_rooms FROM room_types WHERE hotel_id=? AND status=? ORDER BY id').all(hotelId, 'active');

  const results = [];
  for (const room of rooms) {
    const minRooms = room.min_rooms || 1;
    const direct = db.prepare('SELECT contract_price, sales_price, tag FROM direct_prices WHERE room_type_id=? AND date=?').get(room.id, checkDate);
    const ctrip = db.prepare('SELECT ota_price, available_rooms FROM ota_prices WHERE room_type_id=? AND date=? AND ota_source=?').get(room.id, checkDate, 'ctrip');
    const booking = db.prepare('SELECT ota_price, available_rooms FROM ota_prices WHERE room_type_id=? AND date=? AND ota_source=?').get(room.id, checkDate, 'booking');
    const inv = db.prepare('SELECT total_rooms, booked_rooms, status FROM inventory WHERE room_type_id=? AND date=?').get(room.id, checkDate);

    results.push({
      room_type_id: room.id,
      room_name: room.name_cn,
      bed_type: room.bed_type,
      max_guests: room.max_guests,
      meal_plan: room.meal_plan,
      min_rooms: minRooms,
      direct: direct || null,
      ota: {
        ctrip: ctrip || null,
        booking: booking || null
      },
      inventory: inv ? { ...inv, available_rooms: Math.max(0, inv.total_rooms - inv.booked_rooms) } : null
    });
  }

  res.json({ code: 200, data: { hotel_id: hotelId, hotel_name: hotel.name_cn, date: checkDate, rooms: results } });
});

// ==================== 全局搜索 ====================

// GET /api/hotels/search/prices - 多酒店价格对比搜索
router.get('/search/prices', (req, res) => {
  const { keyword, date, star_rating, source } = req.query;
  const checkDate = date || new Date().toISOString().split('T')[0];

  let hotelSql = 'SELECT * FROM hotels WHERE status=?';
  const params = ['active'];
  if (keyword) { hotelSql += ' AND (name LIKE ? OR name_cn LIKE ? OR address_cn LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
  if (star_rating) { hotelSql += ' AND star_rating=?'; params.push(parseInt(star_rating)); }
  if (source) { hotelSql += ' AND source=?'; params.push(source); }

  const hotels = db.prepare(hotelSql).all(...params);
  const results = [];

  for (const hotel of hotels) {
    const rooms = db.prepare('SELECT id, name_cn, bed_type, max_guests, meal_plan, min_rooms FROM room_types WHERE hotel_id=? AND status=?').all(hotel.id, 'active');
    const roomResults = [];
    for (const room of rooms) {
      const minRooms = room.min_rooms || 1;
      const direct = db.prepare('SELECT contract_price, sales_price FROM direct_prices WHERE room_type_id=? AND date=?').get(room.id, checkDate);
      const ctrip = db.prepare('SELECT ota_price FROM ota_prices WHERE room_type_id=? AND date=? AND ota_source=?').get(room.id, checkDate, 'ctrip');
      const booking = db.prepare('SELECT ota_price FROM ota_prices WHERE room_type_id=? AND date=? AND ota_source=?').get(room.id, checkDate, 'booking');
      const inv = db.prepare('SELECT total_rooms, booked_rooms FROM inventory WHERE room_type_id=? AND date=?').get(room.id, checkDate);

      roomResults.push({
        room_type_id: room.id,
        room_name: room.name_cn,
        bed_type: room.bed_type,
        direct: direct || null,
        ota: { ctrip: ctrip?.ota_price || null, booking: booking?.ota_price || null },
        available_rooms: inv ? Math.max(0, inv.total_rooms - inv.booked_rooms) : 0
      });
    }
    results.push({ hotel_id: hotel.id, hotel_name: hotel.name_cn, star_rating: hotel.star_rating, source: hotel.source, address_cn: hotel.address_cn, rooms: roomResults });
  }

  res.json({ code: 200, data: { date: checkDate, hotels: results } });
});

module.exports = router;
