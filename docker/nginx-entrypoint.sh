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

# Proxies whose X-Forwarded-For nginx may believe. Space-separated CIDRs; an
# explicitly empty value disables the realip module (rate limits then key on
# the TCP peer), hence `-` rather than `:-`. The peers of this image are
# proxies on the Docker network, hence the RFC1918 default.
export NGINX_REAL_IP_FROM="${NGINX_REAL_IP_FROM-10.0.0.0/8 172.16.0.0/12 192.168.0.0/16}"
{
    for cidr in $NGINX_REAL_IP_FROM; do echo "set_real_ip_from $cidr;"; done
    echo "real_ip_header X-Forwarded-For;"
    echo "real_ip_recursive on;"
} > /etc/nginx/real-ip.conf

# Generate nginx config from template
envsubst '${NGINX_ACCESS_LOG_LINE} ${NGINX_ERROR_LOG_LEVEL} ${BACKEND_HOST} ${BACKEND_PORT} ${SABREDAV_HOST} ${SABREDAV_PORT} ${MCP_HOST} ${MCP_PORT}' \
    < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "Nginx configuration generated successfully"
