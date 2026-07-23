FROM node:18-alpine

# 修改此值强制清除构建缓存 => 重建所有层
ARG CACHE_BUST=1

WORKDIR /app

# 只复制 package 文件并安装依赖（node_modules 不会从本地复制）
COPY backend/package.json backend/package-lock.json* ./backend/
RUN echo "Cache bust: $CACHE_BUST" && cd backend && npm install --production

# 只复制源代码文件（不复制 node_modules！）
COPY backend/server.js ./backend/
COPY backend/src/ ./backend/src/
COPY backend/public/ ./backend/public/
COPY web/ ./web/

EXPOSE 8766

WORKDIR /app/backend
CMD ["node", "server.js"]
