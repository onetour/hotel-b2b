/**
 * B2B酒店查询预订平台 - 服务入口
 * SQLite (sql.js) + JWT + REST API
 */
const express = require('express');
const cors = require('cors');
const path = require('path');

const PORT = process.env.PORT || 8766;

async function start() {
  // 异步初始化数据库
  const { initDatabase, startAutoSave } = require('./src/db/init');
  await initDatabase();
  startAutoSave(30000);
  console.log('[Server] SQLite 数据库已加载 (sql.js/WebAssembly)');

  const db = require('./src/db/connection');
  const { seed } = require('./src/seeds/seed');

  const app = express();

  // 中间件
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // 强制 UTF-8 编码，解决中文乱码
  app.use((req, res, next) => {
    const oldSend = res.send;
    res.send = function(body) {
      if (typeof body === 'string' && !res.get('Content-Type')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
      return oldSend.call(this, body);
    };
    const oldJson = res.json;
    res.json = function(body) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return oldJson.call(this, body);
    };
    next();
  });

  // 请求日志
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path.startsWith('/api')) {
        console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      }
    });
    next();
  });

  // 路由
  const authRouter = require('./src/routes/auth');
  const hotelsRouter = require('./src/routes/hotels');
  const bookingsRouter = require('./src/routes/bookings');
  const inventoryRouter = require('./src/routes/inventory');
  const syncRouter = require('./src/routes/sync');
  const usersRouter = require('./src/routes/users');
  const { authRequired, adminRequired } = require('./src/middleware/auth');

  app.use('/api/auth', authRouter);
  app.use('/api/hotels', hotelsRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/sync', syncRouter);
  app.use('/api/users', usersRouter);

  // 管理接口
  app.post('/api/init', adminRequired, (req, res) => {
    try {
      seed();
      db.autoSave();
      res.json({ code: 200, msg: '种子数据初始化完成' });
    } catch (e) {
      res.status(500).json({ code: 500, msg: '初始化失败: ' + e.message });
    }
  });

  app.get('/api/stats', authRequired, (req, res) => {
    const hotelCount = db.prepare("SELECT COUNT(*) as c FROM hotels WHERE status='active'").get().c;
    const roomCount = db.prepare("SELECT COUNT(*) as c FROM room_types WHERE status='active'").get().c;
    const directCount = db.prepare('SELECT COUNT(*) as c FROM direct_prices').get().c;
    const otaCount = db.prepare('SELECT COUNT(*) as c FROM ota_prices').get().c;
    const orderCount = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
    const revenue = db.prepare("SELECT COALESCE(SUM(total_price),0) as c FROM orders WHERE status IN ('confirmed','completed')").get().c;
    const lowStock = db.prepare('SELECT COUNT(*) as c FROM inventory WHERE (total_rooms - booked_rooms) <= 3 AND (total_rooms - booked_rooms) > 0').get().c;
    res.json({ code: 200, data: { hotels: hotelCount, rooms: roomCount, direct_prices: directCount, ota_prices: otaCount, orders: orderCount, revenue, low_stock: lowStock } });
  });

  app.get('/api/health', (req, res) => {
    const hotelCount = db.prepare('SELECT COUNT(*) as c FROM hotels').get().c;
    res.json({ code: 200, status: 'ok', db: 'sql.js', hotels: hotelCount, time: new Date().toISOString() });
  });

  // ========== 静态文件托管 ==========
  const staticOptions = {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }
    }
  };

  // 客户前端 → web/ 目录，访问 http://localhost:8766/
  const webDir = path.join(__dirname, '..', 'web');
  app.use('/', express.static(webDir, staticOptions));
  app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(webDir, 'index.html'));
  });

  // 管理后台 → public/ 目录，访问 http://localhost:8766/admin
  const adminDir = path.join(__dirname, 'public');
  app.get('/admin', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(adminDir, 'admin.html'));
  });
  app.use('/admin', express.static(adminDir, staticOptions));

  // API 文档
  app.get('/api', (req, res) => {
    res.json({
      name: 'B2B酒店查询预订平台 API', version: '2.0.0', database: 'SQLite (sql.js)',
      frontend: 'http://localhost:' + PORT,
      admin: 'http://localhost:' + PORT + '/admin',
      endpoints: {
        auth: { login: 'POST /api/auth/login', me: 'GET /api/auth/me' },
        hotels: { list: 'GET /api/hotels', detail: 'GET /api/hotels/:id', compare: 'GET /api/hotels/:id/compare?date=', prices: 'GET /api/hotels/:id/prices?from=&to=', search: 'GET /api/hotels/search/prices?keyword=&date=' },
        bookings: { create: 'POST /api/bookings', list: 'GET /api/bookings', cancel: 'PUT /api/bookings/:id/cancel', stats: 'GET /api/bookings/stats/summary' },
        inventory: { alerts: 'GET /api/inventory/alerts?threshold=5', update: 'PUT /api/inventory/update', batch: 'PUT /api/inventory/batch' },
        sync: { import: 'POST /api/sync/import/excel', ota_push: 'POST /api/sync/ota/push', ota_pull: 'POST /api/sync/ota/pull', logs: 'GET /api/sync/logs' },
        system: { init: 'POST /api/init', stats: 'GET /api/stats', health: 'GET /api/health' }
      }
    });
  });

  // 首次自动初始化
  const hotelCount = db.prepare('SELECT COUNT(*) as c FROM hotels').get().c;
  if (hotelCount === 0) {
    console.log('[Server] 数据库为空，自动初始化种子数据...');
    seed();
    db.autoSave();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(48));
    console.log('  B2B酒店查询预订平台 - 服务已启动');
    console.log('  客户前端: http://localhost:' + PORT);
    console.log('  管理后台: http://localhost:' + PORT + '/admin');
    console.log('  API文档: http://localhost:' + PORT + '/api');
    console.log('  数据库: SQLite (sql.js/WebAssembly)');
    console.log('  局域网: http://' + getLocalIP() + ':' + PORT);
    console.log('='.repeat(48));
  });
}

function getLocalIP() {
  const { networkInterfaces } = require('os');
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

start().catch(e => {
  console.error('[Server] 启动失败:', e);
  process.exit(1);
});
