/**
 * SQLite 数据库（sql.js 封装 - 纯 JS/WASM，零编译依赖）
 * 提供与 better-sqlite3 兼容的 API
 */
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', '..', 'db');
const DB_PATH = path.join(DB_DIR, 'hotel_b2b.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

let db = null;
let sqlInstance = null;

// better-sqlite3 兼容的 Statement 包装器
class Statement {
  constructor(db, sql) {
    this._db = db;
    this._sql = sql;
  }

  run(...params) {
    const flatParams = flattenParams(params);
    try {
      const stmt = this._db.prepare(this._sql);
      if (flatParams.length > 0) stmt.bind(flatParams);
      stmt.step();
      const changes = this._db.getRowsModified();
      stmt.free();
      return { changes };
    } catch (e) {
      const msg = typeof e === 'string' ? e : (e && e.message ? e.message : String(e));
      throw new Error(`SQL Error: ${msg}\nSQL: ${this._sql}\nParams: ${JSON.stringify(flatParams)}`);
    }
  }

  get(...params) {
    const flatParams = flattenParams(params);
    try {
      const stmt = this._db.prepare(this._sql);
      if (flatParams.length > 0) stmt.bind(flatParams);
      let result = null;
      if (stmt.step()) result = stmt.getAsObject();
      stmt.free();
      return result;
    } catch (e) {
      const msg = typeof e === 'string' ? e : (e && e.message ? e.message : String(e));
      throw new Error(`SQL Error: ${msg}\nSQL: ${this._sql}\nParams: ${JSON.stringify(flatParams)}`);
    }
  }

  all(...params) {
    const flatParams = flattenParams(params);
    try {
      const stmt = this._db.prepare(this._sql);
      if (flatParams.length > 0) stmt.bind(flatParams);
      const results = [];
      while (stmt.step()) results.push(stmt.getAsObject());
      stmt.free();
      return results;
    } catch (e) {
      const msg = typeof e === 'string' ? e : (e && e.message ? e.message : String(e));
      throw new Error(`SQL Error: ${msg}\nSQL: ${this._sql}\nParams: ${JSON.stringify(flatParams)}`);
    }
  }

  // 兼容 better-sqlite3 的 pluck/get 模式
  raw(all) {
    return this.all();
  }
}

// 数据库包装器
class Database {
  constructor(sqlDb) {
    this._db = sqlDb;
    this._savePath = DB_PATH;
    this.PATH = DB_PATH;
    this.pragmaQueue = [];
    // 加载已有数据
    if (fs.existsSync(DB_PATH)) {
      try {
        const buffer = fs.readFileSync(DB_PATH);
        this._db = new sqlInstance.Database(buffer);
      } catch (e) {
        console.log('[DB] 加载已有数据库失败，将创建新数据库:', e.message);
        this._db = new sqlInstance.Database();
      }
    } else {
      this._db = new sqlInstance.Database();
    }
  }

  prepare(sql) {
    return new Statement(this._db, sql);
  }

  exec(sql) {
    try {
      this._db.run(sql);
    } catch (e) {
      throw new Error(`SQL Exec Error: ${e.message}\nSQL: ${sql}`);
    }
  }

  pragma(val) {
    this._db.run('PRAGMA ' + val + ';');
  }

  transaction(fn) {
    return (...args) => {
      this._db.run('BEGIN TRANSACTION;');
      try {
        const result = fn(...args);
        this._db.run('COMMIT;');
        return result;
      } catch (e) {
        this._db.run('ROLLBACK;');
        throw e;
      }
    };
  }

  // 保存到文件
  save() {
    const data = this._db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this._savePath, buffer);
  }

  // 自动保存（用于关键操作后）
  autoSave() {
    try {
      this.save();
    } catch (e) {
      console.error('[DB] 自动保存失败:', e.message);
    }
  }

  close() {
    this.save();
    this._db.close();
  }
}

function flattenParams(params) {
  const safeVal = v => (v === null || v === undefined ? '' : v);
  if (params.length === 1) {
    if (Array.isArray(params[0])) return params[0].map(safeVal);
    if (params[0] === undefined || params[0] === null) return [];
    if (typeof params[0] === 'object' && !(params[0] instanceof Date)) {
      return Object.values(params[0]).map(safeVal);
    }
    return [safeVal(params[0])];
  }
  return params.map(safeVal);
}

// ==================== 数据库表定义 ====================

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS hotels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, name_cn TEXT, address TEXT, address_cn TEXT, phone TEXT,
    description TEXT, description_en TEXT, star_rating INTEGER DEFAULT 4,
    source TEXT DEFAULT 'direct', ota_supplier TEXT, ota_hotel_id TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS room_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hotel_id INTEGER NOT NULL, name TEXT NOT NULL, name_cn TEXT,
    bed_type TEXT, area TEXT, max_guests INTEGER DEFAULT 2, meal_plan TEXT,
    min_rooms INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (hotel_id) REFERENCES hotels(id)
  );

  CREATE TABLE IF NOT EXISTS ota_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_type_id INTEGER NOT NULL, date TEXT NOT NULL,
    ota_price REAL NOT NULL, ota_source TEXT NOT NULL DEFAULT 'ctrip',
    currency TEXT DEFAULT 'CNY', available_rooms INTEGER,
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (room_type_id) REFERENCES room_types(id)
  );

  CREATE TABLE IF NOT EXISTS direct_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_type_id INTEGER NOT NULL, date TEXT NOT NULL,
    contract_price REAL NOT NULL, sales_price REAL NOT NULL,
    currency TEXT DEFAULT 'CNY', tag TEXT,
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (room_type_id) REFERENCES room_types(id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_type_id INTEGER NOT NULL, date TEXT NOT NULL,
    total_rooms INTEGER NOT NULL DEFAULT 10, booked_rooms INTEGER NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'open',
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (room_type_id) REFERENCES room_types(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL, hotel_id INTEGER NOT NULL, room_type_id INTEGER NOT NULL,
    check_in TEXT NOT NULL, check_out TEXT NOT NULL, nights INTEGER NOT NULL,
    room_count INTEGER NOT NULL DEFAULT 1, unit_price REAL NOT NULL, total_price REAL NOT NULL,
    price_type TEXT DEFAULT 'direct', guest_name TEXT, guest_phone TEXT, remark TEXT,
    source TEXT DEFAULT 'manual', status TEXT DEFAULT 'confirmed',
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (hotel_id) REFERENCES hotels(id),
    FOREIGN KEY (room_type_id) REFERENCES room_types(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
    nickname TEXT, phone TEXT,
    role TEXT DEFAULT 'staff', status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS ota_sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ota_source TEXT NOT NULL, sync_type TEXT NOT NULL,
    records_count INTEGER DEFAULT 0, status TEXT DEFAULT 'success', error_msg TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_room_hotel ON room_types(hotel_id);
  CREATE INDEX IF NOT EXISTS idx_ota_price_date ON ota_prices(date);
  CREATE INDEX IF NOT EXISTS idx_ota_price_source ON ota_prices(ota_source);
  CREATE INDEX IF NOT EXISTS idx_direct_price_date ON direct_prices(date);
  CREATE INDEX IF NOT EXISTS idx_inventory_date ON inventory(date);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_ota_price_uniq ON ota_prices(room_type_id, date, ota_source);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_direct_price_uniq ON direct_prices(room_type_id, date);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_uniq ON inventory(room_type_id, date);
`;

// ==================== 初始化 ====================

async function initDatabase() {
  sqlInstance = await initSqlJs();
  db = new Database();
  // 执行建表
  db.exec(SCHEMA_SQL);
  // 兼容旧数据库（无 min_rooms 列时补齐）
  try { db.exec('ALTER TABLE room_types ADD COLUMN min_rooms INTEGER DEFAULT 1'); } catch(e) {}
  db.autoSave();
  console.log('[DB] 数据库表结构已就绪');
}

function getDb() {
  if (!db) throw new Error('数据库未初始化，请先调用 initDatabase()');
  return db;
}

// ==================== 自动保存定时器 ====================

let autoSaveTimer = null;
function startAutoSave(intervalMs = 30000) {
  stopAutoSave();
  autoSaveTimer = setInterval(() => {
    try {
      db.autoSave();
    } catch (e) {
      console.error('[DB] 定时保存失败:', e.message);
    }
  }, intervalMs);
}

function stopAutoSave() {
  if (autoSaveTimer) { clearInterval(autoSaveTimer); autoSaveTimer = null; }
}

module.exports = { initDatabase, getDb, startAutoSave, stopAutoSave, DB_PATH };
