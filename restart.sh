#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$ROOT_DIR"

if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  . "$ROOT_DIR/.env"
  set +a
fi

APP_NAME="${PM2_APP_NAME:-berkeleymapper}"

cd "$ROOT_DIR"

if [ ! -d "$APP_DIR/node_modules" ]; then
  npm install --prefix "$APP_DIR"
fi

npm run build --prefix "$APP_DIR"

export NODE_ENV=production
export HOST="${HOST:-127.0.0.1}"
export PORT="${PORT:-4173}"

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start server/static-server.mjs --name "$APP_NAME" \
    --cwd "$APP_DIR" \
    --log-date-format="YYYY-MM-DD HH:mm Z" \
    --update-env
fi
