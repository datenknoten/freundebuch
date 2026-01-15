# syntax=docker/dockerfile:1.4
# ============================================
# Optimized multi-stage build for production
# Requires Docker BuildKit (DOCKER_BUILDKIT=1)
# ============================================

# ============================================
# Stage: Runtime base with system dependencies
# This stage is cached and reused across builds
# Can be pre-built: docker build --target runtime-base -t freundebuch-runtime-base .
# ============================================
FROM node:24-trixie-slim AS runtime-base

# Install nginx, supervisor, curl, gettext (for envsubst), and PHP-FPM 8.4 with PostgreSQL extension
# Debian Trixie includes PHP 8.4 natively
# Combined into single layer for caching
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        nginx supervisor curl gettext-base \
        php8.4-fpm php8.4-pgsql php8.4-xml php8.4-mbstring php8.4-curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    # Configure PHP-FPM to listen on TCP socket instead of Unix socket
    sed -i 's|listen = /run/php/php8.4-fpm.sock|listen = 127.0.0.1:9000|' /etc/php/8.4/fpm/pool.d/www.conf && \
    # Ensure PHP-FPM directory exists
    mkdir -p /run/php && \
    # Enable corepack for pnpm
    corepack enable && corepack prepare pnpm@latest --activate

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
# Stage: Node base with pnpm
# ============================================
FROM node:24-trixie-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ============================================
# Stage: Install dependencies
# Uses cache mount for pnpm store - major speedup on rebuilds
# ============================================
FROM base AS deps

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy all package.json files for dependency resolution
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies with cache mount for pnpm store
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ============================================
# Stage: Build shared package
# ============================================
FROM deps AS shared-builder

COPY packages/shared ./packages/shared
RUN pnpm --filter @freundebuch/shared run build

# ============================================
# Stage: Build backend and migrations
# Runs in parallel with frontend-builder (both depend on shared-builder)
# ============================================
FROM shared-builder AS backend-builder

COPY apps/backend ./apps/backend
COPY database ./database
RUN pnpm --filter @freundebuch/backend run build && \
    pnpm run migrate:build

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
RUN pnpm --filter @freundebuch/frontend run build

# ============================================
# Stage: Production runtime
# Based on runtime-base with all system deps pre-installed
# ============================================
FROM runtime-base AS production

WORKDIR /app

# Copy PHP-FPM pool configuration for logging
COPY docker/php-fpm-pool.conf /etc/php/8.4/fpm/pool.d/zz-logging.conf

# Copy workspace configuration for production dependencies
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only with cache mount
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built artifacts from parallel build stages
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=backend-builder /app/apps/backend/dist ./apps/backend/dist
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
    mkdir -p /var/log/supervisor /app/uploads

# Expose port 80 (nginx)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start via entrypoint (generates nginx config from template, then starts supervisord)
CMD ["/entrypoint.sh"]
