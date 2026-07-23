/**
 * 数据库连接单例
 */
const { getDb } = require('./init');
module.exports = getDb();
