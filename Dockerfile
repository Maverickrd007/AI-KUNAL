FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

COPY frontend/index.html frontend/postcss.config.js frontend/tailwind.config.ts frontend/tsconfig.json frontend/vite.config.ts ./
COPY frontend/src ./src
RUN npm run build

FROM node:20-alpine AS backend-build

WORKDIR /app/backend

RUN apk add --no-cache python3 make g++
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

FROM python:3.11-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV ML_SERVICE_URL=http://127.0.0.1:8000
ENV SQLITE_PATH=/app/data/db/astraml.db
ENV UPLOAD_DIR=/app/data/uploads
ENV MODEL_CACHE_DIR=/app/data/model_cache
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends nginx curl ca-certificates nodejs npm build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY ml-service/requirements.txt /app/ml-service/requirements.txt
RUN pip install --no-cache-dir -r /app/ml-service/requirements.txt
COPY ml-service/app /app/ml-service/app

COPY backend/package.json backend/package-lock.json* /app/backend/
WORKDIR /app/backend
RUN npm ci --omit=dev --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
COPY --from=backend-build /app/backend/dist /app/backend/dist

WORKDIR /app
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
COPY deploy/nginx.single.conf /etc/nginx/nginx.conf
COPY deploy/start-single.sh /app/start-single.sh
RUN chmod +x /app/start-single.sh \
  && mkdir -p /app/data/uploads /app/data/db /app/data/model_cache /run/nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1/health || exit 1

CMD ["/app/start-single.sh"]
