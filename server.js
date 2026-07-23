/**
 * Cyclic.sh 入口文件
 * 项目入口在 backend/server.js，此文件负责从根目录引导启动
 */
const path = require('path');

// __dirname 始终指向当前文件所在目录（仓库根目录），不受 CWD 影响
// backend/server.js 内部也使用 __dirname，引用 ../web 自动正确
const backendEntry = path.join(__dirname, 'backend', 'server.js');
require(backendEntry);
