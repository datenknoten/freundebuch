#!/bin/sh
set -e

# Default values
export NGINX_ERROR_LOG_LEVEL="${NGINX_ERROR_LOG_LEVEL:-warn}"
export BACKEND_HOST="${BACKEND_HOST:-backend}"
export BACKEND_PORT="${BACKEND_PORT:-3000}"
export SABREDAV_HOST="${SABREDAV_HOST:-sabredav}"
export SABREDAV_PORT="${SABREDAV_PORT:-9000}"
export MCP_HOST="${MCP_HOST:-mcp-server}"
export MCP_PORT="${MCP_PORT:-3100}"

# Handle access log configuration
if [ "${NGINX_ACCESS_LOG:-off}" = "off" ]; then
    export NGINX_ACCESS_LOG_LINE="off"
else
    export NGINX_ACCESS_LOG_LINE="${NGINX_ACCESS_LOG} main"
fi

# Generate nginx config from template
envsubst '${NGINX_ACCESS_LOG_LINE} ${NGINX_ERROR_LOG_LEVEL} ${BACKEND_HOST} ${BACKEND_PORT} ${SABREDAV_HOST} ${SABREDAV_PORT} ${MCP_HOST} ${MCP_PORT}' \
    < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "Nginx configuration generated successfully"
