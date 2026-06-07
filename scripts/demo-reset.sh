#!/bin/bash
# Freundebuch demo data reset script
# This script is designed to be placed at /home/deploy-freundebuch/demo-reset.sh
# on the demo server. It wipes the whole stack including volumes, starts it
# fresh, runs migrations, and seeds the demo data.
# Triggered daily at 06:00 UTC by freundebuch-demo-reset.timer.

set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-/srv/demo.freundebuch.datenknoten.me}"
COMPOSE_FILE="${COMPOSE_DIR}/docker-compose.yml"

# Services to start after the wipe (mirrors deploy.sh)
SERVICES=("nginx" "backend" "mcp-server" "sabredav")

cd "${COMPOSE_DIR}"

echo "[INFO] Wiping demo stack including volumes..."
docker compose -f "${COMPOSE_FILE}" down --volumes

echo "[INFO] Running database migrations..."
# `compose run` starts the postgres dependency and waits for it to be healthy
docker compose -f "${COMPOSE_FILE}" run --rm \
    --entrypoint "node" \
    backend \
    node_modules/node-pg-migrate/bin/node-pg-migrate.js \
    --decamelize \
    --migrations-dir database/dist \
    up

echo "[INFO] Starting services..."
docker compose -f "${COMPOSE_FILE}" up -d "${SERVICES[@]}"

echo "[INFO] Seeding demo data..."
docker compose -f "${COMPOSE_FILE}" run --rm \
    --entrypoint node \
    backend \
    /app/apps/backend/dist/scripts/seed.js

echo "[INFO] Demo reset complete."
