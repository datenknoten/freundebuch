# ============================================
# Stage 0: SabreDAV PHP dependencies
# ============================================
FROM composer:2 AS sabredav-deps
WORKDIR /app
COPY apps/sabredav/composer.json apps/sabredav/composer.lock* ./
RUN composer install --no-dev --optimize-autoloader --no-interaction

# ============================================
# Stage 1: Base with pnpm
# ============================================
FROM node:24-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ============================================
# Stage 2: Install dependencies
# ============================================
FROM base AS deps

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy all package.json files for dependency resolution
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 3: Build shared package
# ============================================
FROM deps AS shared-builder

COPY packages/shared ./packages/shared
RUN pnpm --filter @freundebuch/shared run build

# ============================================
# Stage 4: Build backend and migrations
# ============================================
FROM shared-builder AS backend-builder

COPY apps/backend ./apps/backend
COPY database ./database
RUN pnpm --filter @freundebuch/backend run build && \
    pnpm run migrate:build

# ============================================
# Stage 5: Build frontend (static)
# ============================================
FROM shared-builder AS frontend-builder

COPY apps/frontend ./apps/frontend
# Build static frontend - VITE_API_URL is empty for same-origin requests
ENV VITE_API_URL=""
RUN pnpm --filter @freundebuch/frontend run build

# ============================================
# Stage 6: Production runtime
# ============================================
FROM node:24-bookworm-slim AS production

# Install nginx, supervisor, curl, and PHP-FPM with PostgreSQL extension
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        nginx supervisor curl \
        php8.2-fpm php8.2-pgsql php8.2-xml && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    # Configure PHP-FPM to listen on TCP socket instead of Unix socket
    sed -i 's|listen = /run/php/php8.2-fpm.sock|listen = 127.0.0.1:9000|' /etc/php/8.2/fpm/pool.d/www.conf && \
    # Ensure PHP-FPM directory exists
    mkdir -p /run/php

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration for production dependencies
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only (ignore prepare scripts)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built artifacts
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

# Copy nginx configuration
COPY docker/nginx.prod.conf /etc/nginx/nginx.conf

# Copy supervisor configuration
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create required directories
RUN mkdir -p /var/log/supervisor /app/uploads

# Expose port 80 (nginx)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start supervisor (manages nginx + node)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
