#!/bin/sh
set -eu

mkdir -p "${UPLOAD_DIR:-/app/data/uploads}" /app/data/db "${MODEL_CACHE_DIR:-/app/data/model_cache}"

cd /app/ml-service
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
ML_PID=$!

cd /app/backend
node dist/index.js &
BACKEND_PID=$!

cleanup() {
  kill "$ML_PID" "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup INT TERM

nginx -g "daemon off;" &
NGINX_PID=$!

wait "$NGINX_PID"
