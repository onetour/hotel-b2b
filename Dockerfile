FROM node:18-alpine

WORKDIR /app

# 先复制 backend 依赖文件并安装
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm install --production

# 复制全部代码
COPY . .

# 暴露端口
EXPOSE 8766

# 从 backend 目录启动
WORKDIR /app/backend
CMD ["node", "server.js"]
