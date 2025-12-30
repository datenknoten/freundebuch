#!/bin/bash
# Freundebuch deployment script
# This script is designed to be placed at /home/deploy-freundebuch/deploy.sh on the server
# It pulls the latest Docker image, runs migrations, and restarts the service

set -euo pipefail

# Configuration
COMPOSE_DIR="/home/deploy-freundebuch"
COMPOSE_FILE="${COMPOSE_DIR}/docker-compose.prod.yml"
IMAGE="ghcr.io/enko/freundebuch2:latest"
CONTAINER_NAME="freundebuch"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Change to compose directory
cd "${COMPOSE_DIR}"

log_info "Starting Freundebuch deployment..."

# Step 1: Pull the latest Docker image
log_info "Pulling latest Docker image: ${IMAGE}"
docker pull "${IMAGE}"

# Step 2: Stop the current service (gracefully)
log_info "Stopping current service..."
docker compose -f "${COMPOSE_FILE}" stop freundebuch || true

# Step 3: Run database migrations
log_info "Running database migrations..."
docker compose -f "${COMPOSE_FILE}" run --rm \
    --entrypoint "node" \
    freundebuch \
    node_modules/node-pg-migrate/bin/node-pg-migrate.js \
    --decamelize \
    --migrations-dir database/dist \
    up

# Step 4: Restart the service with the new image
log_info "Starting service with new image..."
docker compose -f "${COMPOSE_FILE}" up -d freundebuch

# Step 5: Wait for health check
log_info "Waiting for service to become healthy..."
TIMEOUT=120
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "${CONTAINER_NAME}" 2>/dev/null || echo "unknown")
    if [ "$HEALTH" = "healthy" ]; then
        log_info "Service is healthy!"
        break
    fi
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    log_info "Waiting for health check... (${ELAPSED}s/${TIMEOUT}s)"
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    log_warn "Health check timeout reached. Service may still be starting."
    log_warn "Check logs with: docker logs ${CONTAINER_NAME}"
fi

# Step 6: Clean up old images
log_info "Cleaning up unused Docker images..."
docker image prune -f

log_info "Deployment complete!"
