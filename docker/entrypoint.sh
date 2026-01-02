#!/bin/sh
set -e

# Default values for nginx logging configuration
export NGINX_ERROR_LOG_LEVEL="${NGINX_ERROR_LOG_LEVEL:-warn}"

# Handle access log configuration
# When "off", we can't append a log format - nginx rejects "off main"
# When a path is specified, use the "main" format
if [ "${NGINX_ACCESS_LOG:-off}" = "off" ]; then
    export NGINX_ACCESS_LOG_LINE="off"
else
    export NGINX_ACCESS_LOG_LINE="${NGINX_ACCESS_LOG} main"
fi

# Generate nginx config from template
envsubst '${NGINX_ACCESS_LOG_LINE} ${NGINX_ERROR_LOG_LEVEL}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Run database migrations
echo "Running database migrations..."
cd /app && node node_modules/node-pg-migrate/bin/node-pg-migrate.js --decamelize --migrations-dir database/dist up
echo "Database migrations completed."

# Start supervisord
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
