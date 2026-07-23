/**
 * OTA 数据同步 API
 * 支持：Excel/CSV 导入、OTA API 对接接口预留
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/connection');
const { authRequired, adminRequired } = require('../middleware/auth');

const upload = multer({ dest: path.join(__dirname, '..', '..', 'uploads') });

// ==================== Excel 导入 ====================

// POST /api/sync/import/excel - 导入 Excel/CSV 价格数据
router.post('/import/excel', authRequired, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ code: 400, msg: '请上传文件' });

  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) return res.status(400).json({ code: 400, msg: '文件为空' });

    // 映射字段名（中文/英文兼容）
    const mapField = (row, keys) => { for (const k of keys) { if (row[k] !== undefined) return row[k]; } return null; };

    const importData = db.transaction(() => {
      let imported = 0;
      for (const row of data) {
        const room_type_id = parseInt(mapField(row, ['room_type_id', '房型ID', 'roomTypeId']));
        const date = String(mapField(row, ['date', '日期'])).trim();
        const contract_price = parseFloat(mapField(row, ['contract_price', '合同价', 'contractPrice']));
        const sales_price = parseFloat(mapField(row, ['sales_price', '销售价', 'salesPrice']));
        const ota_price = parseFloat(mapField(row, ['ota_price', 'OTA价', 'otaPrice']));
        const ota_source = String(mapField(row, ['ota_source', 'OTA来源', 'otaSource']) || 'ctrip').trim();
        const total_rooms = parseInt(mapField(row, ['total_rooms', '总库存', 'totalRooms']));

        if (!room_type_id || !date) continue;

        if (contract_price && sales_price) {
          db.prepare(`INSERT INTO direct_prices (room_type_id, date, contract_price, sales_price) VALUES (?,?,?,?)
            ON CONFLICT(room_type_id, date) DO UPDATE SET contract_price=excluded.contract_price, sales_price=excluded.sales_price, updated_at=datetime('now','localtime')`)
            .run(room_type_id, date, contract_price, sales_price);
        }

        if (ota_price && ota_source) {
          db.prepare(`INSERT INTO ota_prices (room_type_id, date, ota_price, ota_source) VALUES (?,?,?,?)
            ON CONFLICT(room_type_id, date, ota_source) DO UPDATE SET ota_price=excluded.ota_price, updated_at=datetime('now','localtime')`)
            .run(room_type_id, date, ota_price, ota_source);
        }

        if (total_rooms) {
          db.prepare(`INSERT INTO inventory (room_type_id, date, total_rooms, booked_rooms, status) VALUES (?,?,?,0,'open')
            ON CONFLICT(room_type_id, date) DO UPDATE SET total_rooms=excluded.total_rooms, updated_at=datetime('now','localtime')`)
            .run(room_type_id, date, total_rooms);
        }

        imported++;
      }
      return imported;
    });

    const count = importData();

    // 记录同步日志
    db.prepare('INSERT INTO ota_sync_log (ota_source, sync_type, records_count) VALUES (?,?,?)')
      .run('import', 'excel', count);

    // 清理上传文件
    fs.unlinkSync(req.file.path);

    res.json({ code: 200, msg: `成功导入${count}条数据`, data: { imported: count } });
  } catch (e) {
    // 清理文件
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.status(500).json({ code: 500, msg: '导入失败: ' + e.message });
  }
});

// ==================== OTA API 对接接口（预留） ====================

// POST /api/sync/ota/push - OTA 推送价格/库存（供第三方 OTA 调用）
router.post('/ota/push', (req, res) => {
  const { supplier, api_key, prices, inventory } = req.body;

  // TODO: 验证 api_key
  if (!supplier || !api_key) return res.status(400).json({ code: 400, msg: '缺少 supplier 或 api_key' });

  const syncData = db.transaction(() => {
    let priceCount = 0, invCount = 0;

    if (prices && Array.isArray(prices)) {
      for (const p of prices) {
        if (!p.room_type_id || !p.date) continue;
        db.prepare(`INSERT INTO ota_prices (room_type_id, date, ota_price, ota_source, available_rooms) VALUES (?,?,?,?,?)
          ON CONFLICT(room_type_id, date, ota_source) DO UPDATE SET ota_price=excluded.ota_price, available_rooms=excluded.available_rooms, updated_at=datetime('now','localtime')`)
          .run(p.room_type_id, p.date, p.ota_price, supplier, p.available_rooms || null);
        priceCount++;
      }
    }

    if (inventory && Array.isArray(inventory)) {
      for (const i of inventory) {
        if (!i.room_type_id || !i.date) continue;
        db.prepare(`INSERT INTO inventory (room_type_id, date, total_rooms, booked_rooms, status) VALUES (?,?,?,?,?)
          ON CONFLICT(room_type_id, date) DO UPDATE SET total_rooms=excluded.total_rooms, booked_rooms=excluded.booked_rooms, status=excluded.status, updated_at=datetime('now','localtime')`)
          .run(i.room_type_id, i.date, i.total_rooms, i.booked_rooms || 0, (i.booked_rooms || 0) >= i.total_rooms ? 'full' : 'open');
        invCount++;
      }
    }

    return { priceCount, invCount };
  });

  const result = syncData();

  // 记录日志
  db.prepare('INSERT INTO ota_sync_log (ota_source, sync_type, records_count) VALUES (?,?,?)')
    .run(supplier, 'api_push', result.priceCount + result.invCount);

  res.json({ code: 200, msg: '同步成功', data: result });
});

// POST /api/sync/ota/pull - 从 OTA 拉取价格（预留对接接口）
router.post('/ota/pull', adminRequired, (req, res) => {
  const { supplier } = req.body;
  if (!supplier) return res.status(400).json({ code: 400, msg: '缺少 supplier' });

  // TODO: 对接真实的 OTA API
  // const data = await fetchOTAPrices(supplier, hotels);
  // 将拉取的数据写入 ota_prices 表

  res.json({ code: 200, msg: `OTA ${supplier} 拉取接口已预留，待对接真实API`, data: { supplier } });
});

// GET /api/sync/logs - 同步日志
router.get('/logs', authRequired, (req, res) => {
  const logs = db.prepare('SELECT * FROM ota_sync_log ORDER BY created_at DESC LIMIT 50').all();
  res.json({ code: 200, data: logs });
});

module.exports = router;
