#!/bin/sh
set -e

# Default values for nginx logging configuration
export NGINX_ACCESS_LOG="${NGINX_ACCESS_LOG:-off}"
export NGINX_ERROR_LOG_LEVEL="${NGINX_ERROR_LOG_LEVEL:-warn}"

# Generate nginx config from template
envsubst '${NGINX_ACCESS_LOG} ${NGINX_ERROR_LOG_LEVEL}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start supervisord
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
