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

# Proxies whose X-Forwarded-For nginx may believe. Space-separated CIDRs; empty
# disables the realip module (rate limits then key on the TCP peer). This image
# is fronted by whatever the operator runs, so nothing is trusted by default.
export NGINX_REAL_IP_FROM="${NGINX_REAL_IP_FROM:-}"
{
    for cidr in $NGINX_REAL_IP_FROM; do echo "set_real_ip_from $cidr;"; done
    echo "real_ip_header X-Forwarded-For;"
    echo "real_ip_recursive on;"
} > /etc/nginx/real-ip.conf

# Generate nginx config from template
envsubst '${NGINX_ACCESS_LOG_LINE} ${NGINX_ERROR_LOG_LEVEL}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start supervisord
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
