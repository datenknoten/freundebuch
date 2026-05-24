# syntax=docker/dockerfile:1.4
# ============================================
# Optimized multi-stage build for production
# Requires Docker BuildKit (DOCKER_BUILDKIT=1)
#
# Toolchain: aube + node are installed via mise from mise.toml.
#
# Unlike the other Dockerfiles, this image does NOT use the ghcr.io/jdx/mise base
# image. It bundles all services in one container and needs php8.2-fpm, which is
# packaged for Debian bookworm; the mise image's OS does not ship php8.2. So we
# base on node:24-bookworm-slim and install mise via its official installer
# (pinned version) instead.
#
# MISE_NO_HOOKS skips mise.toml's dev-only postinstall hook (no .git here).
# ============================================

# ============================================
# Stage: Runtime base with system dependencies
# This stage is cached and reused across builds
# Can be pre-built: docker build --target runtime-base -t freundebuch-runtime-base .
# ============================================
FROM node:24-bookworm-slim AS runtime-base

ENV MISE_NO_HOOKS=1
ENV MISE_DATA_DIR=/mise
ENV PATH="/mise/shims:${PATH}"

# Install nginx, supervisor, curl, gettext (for envsubst), and PHP-FPM with PostgreSQL extension
# Combined into single layer for caching
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        nginx supervisor curl ca-certificates gettext-base \
        php8.2-fpm php8.2-pgsql php8.2-xml php8.2-mbstring php8.2-curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    # Configure PHP-FPM to listen on TCP socket instead of Unix socket
    sed -i 's|listen = /run/php/php8.2-fpm.sock|listen = 127.0.0.1:9000|' /etc/php/8.2/fpm/pool.d/www.conf && \
    # Ensure PHP-FPM directory exists
    mkdir -p /run/php && \
    # Install mise via its installer rather than the mise base image (php8.2
    # needs the bookworm base — see header). Pinned; provides node + aube.
    curl -fsSL https://mise.run | MISE_VERSION=v2026.5.15 MISE_INSTALL_PATH=/usr/local/bin/mise sh

# ============================================
# Stage: SabreDAV PHP dependencies
# Runs in parallel with Node stages
# ============================================
FROM composer:2 AS sabredav-deps
WORKDIR /app
COPY apps/sabredav/composer.json apps/sabredav/composer.lock* ./
# Use cache mount for composer and ignore platform reqs (pdo_pgsql is in runtime image)
RUN --mount=type=cache,id=composer,target=/root/.composer/cache \
    composer install --no-dev --optimize-autoloader --no-interaction --ignore-platform-reqs

# ============================================
# Stage: Node base with aube (via mise)
# ============================================
FROM node:24-bookworm-slim AS base
ENV MISE_NO_HOOKS=1
ENV MISE_DATA_DIR=/mise
ENV PATH="/mise/shims:${PATH}"
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    # mise installed via its installer to share the bookworm base with the
    # production stage (see header for why this image avoids the mise base image).
    curl -fsSL https://mise.run | MISE_VERSION=v2026.5.15 MISE_INSTALL_PATH=/usr/local/bin/mise sh
WORKDIR /app

# ============================================
# Stage: Install dependencies
# Uses cache mount for the aube store - major speedup on rebuilds
# ============================================
FROM base AS deps

# Copy workspace configuration
COPY mise.toml ./
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy all package.json files for dependency resolution
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/mcp-server/package.json ./apps/mcp-server/
COPY packages/shared/package.json ./packages/shared/

# Install the toolchain pinned in mise.toml, then all JS dependencies.
RUN mise trust && mise install
RUN --mount=type=cache,id=aube,target=/root/.local/share/aube/store \
    aube ci

# ============================================
# Stage: Build shared package
# ============================================
FROM deps AS shared-builder

COPY packages/shared ./packages/shared
RUN aube --filter @freundebuch/shared run build

# ============================================
# Stage: Build backend and migrations
# Runs in parallel with frontend-builder (both depend on shared-builder)
# ============================================
FROM shared-builder AS backend-builder

COPY apps/backend ./apps/backend
COPY database ./database
RUN aube --filter @freundebuch/backend run build && \
    aube run migrate:build

# ============================================
# Stage: Build MCP server
# Runs in parallel with backend-builder and frontend-builder
# ============================================
FROM backend-builder AS mcp-server-builder

COPY apps/mcp-server ./apps/mcp-server
RUN aube --filter @freundebuch/mcp-server run build

# ============================================
# Stage: Build frontend (static)
# Runs in parallel with backend-builder (both depend on shared-builder)
# ============================================
FROM shared-builder AS frontend-builder

COPY apps/frontend ./apps/frontend
# Build static frontend - VITE_API_URL is empty for same-origin requests
ENV VITE_API_URL=""
# Sentry DSN is passed as build arg (optional)
ARG VITE_SENTRY_DSN=""
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
RUN aube --filter @freundebuch/frontend run build

# ============================================
# Stage: Production runtime
# Based on runtime-base with all system deps pre-installed
# ============================================
FROM runtime-base AS production

WORKDIR /app

# Copy PHP-FPM pool configuration for logging
COPY docker/php-fpm-pool.conf /etc/php/8.2/fpm/pool.d/zz-logging.conf

# Copy workspace configuration for production dependencies
COPY mise.toml ./
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/mcp-server/package.json ./apps/mcp-server/
COPY packages/shared/package.json ./packages/shared/

# Install the toolchain pinned in mise.toml, then production dependencies only.
RUN mise trust && mise install
RUN --mount=type=cache,id=aube,target=/root/.local/share/aube/store \
    aube install --prod

# Copy built artifacts from parallel build stages
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=backend-builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=mcp-server-builder /app/apps/mcp-server/dist ./apps/mcp-server/dist
COPY --from=frontend-builder /app/apps/frontend/build ./apps/frontend/build

# Copy compiled database migrations
COPY --from=backend-builder /app/database/dist ./database/dist

# Copy SabreDAV application
COPY --from=sabredav-deps /app/vendor ./apps/sabredav/vendor
COPY apps/sabredav/config ./apps/sabredav/config
COPY apps/sabredav/public ./apps/sabredav/public
COPY apps/sabredav/src ./apps/sabredav/src

# Copy nginx configuration template (will be processed by entrypoint)
COPY docker/nginx.conf.template /etc/nginx/nginx.conf.template

# Copy entrypoint script and supervisor configuration
COPY docker/entrypoint.sh /entrypoint.sh
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
RUN chmod +x /entrypoint.sh && \
    mkdir -p /var/log/supervisor /app/uploads && \
    chown -R node:node /app /var/log/supervisor

# Expose port 80 (nginx)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start via entrypoint (generates nginx config from template, then starts supervisord)
CMD ["/entrypoint.sh"]
