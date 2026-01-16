#!/bin/bash
# Freundebuch deployment script (multi-service version)
# This script is designed to be placed at /home/deploy-freundebuch/deploy.sh on the server
# It pulls the specified Docker image versions, updates .env, runs migrations, and restarts services
# Usage: ./deploy.sh <version>  (e.g., ./deploy.sh 2.14.0)

set -euo pipefail

# Colors for output (defined early for usage validation)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for version argument
if [ -z "${1:-}" ]; then
    echo -e "${RED}[ERROR]${NC} Version argument required. Usage: $0 <version>"
    echo -e "${RED}[ERROR]${NC} Example: $0 2.14.0"
    exit 1
fi

VERSION="$1"

# Configuration
COMPOSE_DIR="/srv/freundebuch.schumacher.im"
COMPOSE_FILE="${COMPOSE_DIR}/docker-compose.yml"
IMAGE_BASE="ghcr.io/enko/freundebuch2"

# Service images (multi-service architecture)
IMAGES=(
    "${IMAGE_BASE}-nginx:${VERSION}"
    "${IMAGE_BASE}-backend:${VERSION}"
    "${IMAGE_BASE}-sabredav:${VERSION}"
)

# Services to manage
SERVICES=("nginx" "backend" "sabredav")

# Retry configuration
MAX_PULL_RETRIES=5
INITIAL_RETRY_DELAY=5

# Rollback state
PREVIOUS_VERSION=""
DEPLOYMENT_STARTED=false
ENV_FILE="${COMPOSE_DIR}/.env"

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
    local service="$1"
    docker compose -f "${COMPOSE_FILE}" ps -q "${service}" 2>/dev/null | head -1 | xargs -I{} docker inspect --format='{{.Name}}' {} 2>/dev/null | sed 's/^\///' || echo ""
}

# Get the version from .env file
get_env_version() {
    if [ -f "$ENV_FILE" ]; then
        grep -E "^VERSION=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2 || echo ""
    else
        echo ""
    fi
}

# Update version in .env file
set_env_version() {
    local new_version="$1"
    if [ -f "$ENV_FILE" ]; then
        if grep -q "^VERSION=" "$ENV_FILE"; then
            # Update existing VERSION
            sed -i "s/^VERSION=.*/VERSION=${new_version}/" "$ENV_FILE"
        else
            # Append VERSION
            echo "VERSION=${new_version}" >> "$ENV_FILE"
        fi
    else
        # Create .env with VERSION
        echo "VERSION=${new_version}" > "$ENV_FILE"
    fi
}

# Pull image with retry and exponential backoff
pull_image_with_retry() {
    local image="$1"
    local retry=0
    local delay=$INITIAL_RETRY_DELAY

    while [ $retry -lt $MAX_PULL_RETRIES ]; do
        log_info "Attempting to pull ${image} (attempt $((retry + 1))/${MAX_PULL_RETRIES})..."
        if docker pull "${image}"; then
            log_info "Successfully pulled ${image}"
            return 0
        fi

        retry=$((retry + 1))
        if [ $retry -lt $MAX_PULL_RETRIES ]; then
            log_warn "Pull failed, retrying in ${delay}s..."
            sleep $delay
            delay=$((delay * 2))  # Exponential backoff
        fi
    done

    log_error "Failed to pull ${image} after ${MAX_PULL_RETRIES} attempts"
    return 1
}

# Pull all images in parallel
pull_all_images() {
    log_info "Pulling all Docker images in parallel..."

    local pids=()
    local failed=false

    for image in "${IMAGES[@]}"; do
        (
            pull_image_with_retry "$image"
        ) &
        pids+=($!)
    done

    # Wait for all pulls to complete
    for pid in "${pids[@]}"; do
        if ! wait "$pid"; then
            failed=true
        fi
    done

    if [ "$failed" = true ]; then
        return 1
    fi

    log_info "All images pulled successfully"
    return 0
}

# Rollback to previous version
rollback() {
    log_error "Deployment failed! Initiating rollback..."

    if [ -n "$PREVIOUS_VERSION" ]; then
        log_info "Rolling back to previous version: ${PREVIOUS_VERSION}"

        # Restore previous version in .env
        set_env_version "$PREVIOUS_VERSION"

        # Pull the previous version images (should be cached locally)
        for service in "${SERVICES[@]}"; do
            local previous_image="${IMAGE_BASE}-${service}:${PREVIOUS_VERSION}"
            docker pull "$previous_image" 2>/dev/null || true
        done

        # Restart all services with previous version
        docker compose -f "${COMPOSE_FILE}" up -d "${SERVICES[@]}" || true
        log_warn "Rollback completed. Services restored to version ${PREVIOUS_VERSION}."
    else
        log_error "No previous version available for rollback."
        log_error "Attempting to restart services with current images..."
        docker compose -f "${COMPOSE_FILE}" up -d "${SERVICES[@]}" || true
    fi

    exit 1
}

# Set up trap for rollback on failure
trap 'if [ "$DEPLOYMENT_STARTED" = true ]; then rollback; fi' ERR

# Change to compose directory
cd "${COMPOSE_DIR}"

log_info "Starting Freundebuch deployment (multi-service)..."
log_info "Deploying version: ${VERSION}"

# Step 1: Save the current version from .env for potential rollback
log_info "Reading current version from .env for potential rollback..."
PREVIOUS_VERSION=$(get_env_version)
if [ -n "$PREVIOUS_VERSION" ]; then
    log_info "Current version in .env: ${PREVIOUS_VERSION}"
else
    log_warn "No VERSION found in .env (first deployment?)"
fi

# Step 2: Pull all Docker images with retry logic (parallel)
if ! pull_all_images; then
    log_error "Failed to pull new images. Aborting deployment."
    exit 1
fi

# Update .env with new version for docker-compose
log_info "Updating .env with VERSION=${VERSION}"
set_env_version "$VERSION"

# Mark deployment as started (enables rollback on failure)
DEPLOYMENT_STARTED=true

# Step 3: Run database migrations BEFORE stopping services (reduces downtime)
# Migrations run from the backend service
log_info "Running database migrations..."
if ! docker compose -f "${COMPOSE_FILE}" run --rm \
    --entrypoint "node" \
    backend \
    node_modules/node-pg-migrate/bin/node-pg-migrate.js \
    --decamelize \
    --migrations-dir database/dist \
    up; then
    log_error "Migration failed!"
    rollback
fi

# Step 4: Stop all services (brief downtime starts here)
log_info "Stopping current services..."
docker compose -f "${COMPOSE_FILE}" stop "${SERVICES[@]}" || true

# Step 5: Start all services with new images
log_info "Starting services with new images..."
docker compose -f "${COMPOSE_FILE}" up -d "${SERVICES[@]}"

# Step 6: Wait for health checks (check nginx as it depends on backend and sabredav)
log_info "Waiting for services to become healthy..."
TIMEOUT=120
ELAPSED=0
CONTAINER_NAME=$(get_container_name "nginx")

if [ -z "$CONTAINER_NAME" ]; then
    log_warn "Could not determine nginx container name, using default"
    CONTAINER_NAME="freundebuch-nginx"
fi

while [ $ELAPSED -lt $TIMEOUT ]; do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "${CONTAINER_NAME}" 2>/dev/null || echo "unknown")
    if [ "$HEALTH" = "healthy" ]; then
        log_info "All services are healthy!"
        DEPLOYMENT_STARTED=false  # Disable rollback trap - deployment succeeded
        break
    elif [ "$HEALTH" = "unhealthy" ]; then
        log_error "Service reported unhealthy status!"
        # Show logs for debugging
        log_error "Recent logs from services:"
        docker compose -f "${COMPOSE_FILE}" logs --tail=20 "${SERVICES[@]}" 2>/dev/null || true
        rollback
    fi
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    log_info "Waiting for health check... (${ELAPSED}s/${TIMEOUT}s, status: ${HEALTH})"
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    log_error "Health check timeout reached. Services failed to become healthy."
    # Show logs for debugging
    log_error "Recent logs from services:"
    docker compose -f "${COMPOSE_FILE}" logs --tail=20 "${SERVICES[@]}" 2>/dev/null || true
    rollback
fi

# Deployment succeeded - disable rollback
DEPLOYMENT_STARTED=false

# Step 7: Clean up old images (but keep the previous one for a bit)
log_info "Cleaning up unused Docker images..."
docker image prune -f --filter "until=24h"

log_info "Deployment complete!"
log_info "Services deployed: ${SERVICES[*]}"
log_info "Version: ${VERSION}"
