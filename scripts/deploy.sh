#!/bin/bash
# Freundebuch deployment script
# This script is designed to be placed at /home/deploy-freundebuch/deploy.sh on the server
# It pulls the latest Docker image, runs migrations, and restarts the service

set -euo pipefail

# Configuration
COMPOSE_DIR="/srv/freundebuch.schumacher.im"
COMPOSE_FILE="${COMPOSE_DIR}/docker-compose.yml"
IMAGE="ghcr.io/enko/freundebuch2:latest"
SERVICE_NAME="freundebuch"

# Retry configuration
MAX_PULL_RETRIES=5
INITIAL_RETRY_DELAY=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Rollback state
PREVIOUS_IMAGE_ID=""
DEPLOYMENT_STARTED=false

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get the container name from docker compose
get_container_name() {
    docker compose -f "${COMPOSE_FILE}" ps -q "${SERVICE_NAME}" 2>/dev/null | head -1 | xargs -I{} docker inspect --format='{{.Name}}' {} 2>/dev/null | sed 's/^\///' || echo ""
}

# Pull image with retry and exponential backoff
pull_image_with_retry() {
    local retry=0
    local delay=$INITIAL_RETRY_DELAY

    while [ $retry -lt $MAX_PULL_RETRIES ]; do
        log_info "Attempting to pull image (attempt $((retry + 1))/${MAX_PULL_RETRIES})..."
        if docker pull "${IMAGE}"; then
            log_info "Successfully pulled image"
            return 0
        fi

        retry=$((retry + 1))
        if [ $retry -lt $MAX_PULL_RETRIES ]; then
            log_warn "Pull failed, retrying in ${delay}s..."
            sleep $delay
            delay=$((delay * 2))  # Exponential backoff
        fi
    done

    log_error "Failed to pull image after ${MAX_PULL_RETRIES} attempts"
    return 1
}

# Rollback to previous image
rollback() {
    log_error "Deployment failed! Initiating rollback..."

    if [ -n "$PREVIOUS_IMAGE_ID" ]; then
        log_info "Rolling back to previous image: ${PREVIOUS_IMAGE_ID}"

        # Tag the previous image back as latest
        docker tag "${PREVIOUS_IMAGE_ID}" "${IMAGE}" || true

        # Restart the service with the old image
        docker compose -f "${COMPOSE_FILE}" up -d "${SERVICE_NAME}" || true

        log_warn "Rollback completed. Service restored to previous version."
    else
        log_error "No previous image available for rollback."
        log_error "Attempting to restart service with current image..."
        docker compose -f "${COMPOSE_FILE}" up -d "${SERVICE_NAME}" || true
    fi

    exit 1
}

# Set up trap for rollback on failure
trap 'if [ "$DEPLOYMENT_STARTED" = true ]; then rollback; fi' ERR

# Change to compose directory
cd "${COMPOSE_DIR}"

log_info "Starting Freundebuch deployment..."

# Step 1: Save the current image ID for potential rollback
log_info "Saving current image ID for potential rollback..."
PREVIOUS_IMAGE_ID=$(docker images --format "{{.ID}}" "${IMAGE}" 2>/dev/null | head -1 || echo "")
if [ -n "$PREVIOUS_IMAGE_ID" ]; then
    log_info "Current image ID: ${PREVIOUS_IMAGE_ID}"
else
    log_warn "No previous image found (first deployment?)"
fi

# Step 2: Pull the latest Docker image with retry logic
log_info "Pulling latest Docker image: ${IMAGE}"
if ! pull_image_with_retry; then
    log_error "Failed to pull new image. Aborting deployment."
    exit 1
fi

# Mark deployment as started (enables rollback on failure)
DEPLOYMENT_STARTED=true

# Step 3: Run database migrations BEFORE stopping the service (reduces downtime)
# The database is still accessible while the old service runs
log_info "Running database migrations..."
if ! docker compose -f "${COMPOSE_FILE}" run --rm \
    --entrypoint "node" \
    "${SERVICE_NAME}" \
    node_modules/node-pg-migrate/bin/node-pg-migrate.js \
    --decamelize \
    --migrations-dir database/dist \
    up; then
    log_error "Migration failed!"
    rollback
fi

# Step 4: Stop the current service (brief downtime starts here)
log_info "Stopping current service..."
docker compose -f "${COMPOSE_FILE}" stop "${SERVICE_NAME}" || true

# Step 5: Start the service with the new image
log_info "Starting service with new image..."
docker compose -f "${COMPOSE_FILE}" up -d "${SERVICE_NAME}"

# Step 6: Wait for health check
log_info "Waiting for service to become healthy..."
TIMEOUT=120
ELAPSED=0
CONTAINER_NAME=$(get_container_name)

if [ -z "$CONTAINER_NAME" ]; then
    log_warn "Could not determine container name, using service name"
    CONTAINER_NAME="${SERVICE_NAME}"
fi

while [ $ELAPSED -lt $TIMEOUT ]; do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "${CONTAINER_NAME}" 2>/dev/null || echo "unknown")
    if [ "$HEALTH" = "healthy" ]; then
        log_info "Service is healthy!"
        DEPLOYMENT_STARTED=false  # Disable rollback trap - deployment succeeded
        break
    elif [ "$HEALTH" = "unhealthy" ]; then
        log_error "Service reported unhealthy status!"
        rollback
    fi
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    log_info "Waiting for health check... (${ELAPSED}s/${TIMEOUT}s, status: ${HEALTH})"
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    log_error "Health check timeout reached. Service failed to become healthy."
    rollback
fi

# Deployment succeeded - disable rollback
DEPLOYMENT_STARTED=false

# Step 7: Clean up old images (but keep the previous one for a bit)
log_info "Cleaning up unused Docker images..."
docker image prune -f --filter "until=24h"

log_info "Deployment complete!"
