FROM node:18-alpine

# 修改此值强制清除构建缓存
ARG CACHE_BUST=7

WORKDIR /app

# CACHE_BUST 必须在 COPY 之前，才能让 COPY 层也失效
RUN echo "Cache bust: $CACHE_BUST"

COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# 只复制源代码文件（不复制 node_modules！）
COPY backend/server.js ./backend/
COPY backend/src/ ./backend/src/
COPY backend/public/ ./backend/public/
COPY web/ ./web/

EXPOSE 8766

WORKDIR /app/backend
CMD ["node", "server.js"]
