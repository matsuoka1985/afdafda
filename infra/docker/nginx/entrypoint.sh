#!/bin/sh
set -e

echo "=== Nginx Startup ==="
echo "VPC_CIDR=${VPC_CIDR:-unset}"

# Check if VPC_CIDR is set
if [ -z "${VPC_CIDR}" ]; then
    echo "ERROR: VPC_CIDR environment variable is not set!"
    exit 1
fi

# Validate CIDR format (basic check)
if ! echo "${VPC_CIDR}" | grep -E '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$' > /dev/null; then
    echo "ERROR: VPC_CIDR format is invalid: ${VPC_CIDR}"
    exit 1
fi

echo "✓ VPC_CIDR validation successful: ${VPC_CIDR}"

# Let envsubst process the template
echo "Processing nginx configuration template..."
envsubst '${VPC_CIDR}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Generated nginx config:"
echo "--- /etc/nginx/conf.d/default.conf ---"
head -20 /etc/nginx/conf.d/default.conf | grep -A5 -B5 "set_real_ip_from"
echo "--- End of config snippet ---"

# Test nginx configuration
nginx -t

# Start nginx
echo "Starting nginx..."
exec nginx -g "daemon off;"