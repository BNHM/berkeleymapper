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

if [ "${FORCE_BUILD:-}" = "1" ] || [ ! -f "$APP_DIR/dist/index.html" ]; then
  npm run build --prefix "$APP_DIR"
fi

export NODE_ENV=production
export HOST="${HOST:-127.0.0.1}"
export PORT="${PORT:-4173}"

pm2 start server/static-server.mjs --name "$APP_NAME" \
  --cwd "$APP_DIR" \
  --log-date-format="YYYY-MM-DD HH:mm Z" \
  --update-env
