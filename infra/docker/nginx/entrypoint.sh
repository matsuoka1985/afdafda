#!/bin/sh
set -e

# Ensure output goes to stdout/stderr for CloudWatch
exec 1>&1
exec 2>&2

echo "=== Nginx Startup ===" >&2
echo "VPC_CIDR=${VPC_CIDR:-unset}" >&2

# Check if VPC_CIDR is set
if [ -z "${VPC_CIDR}" ]; then
    echo "ERROR: VPC_CIDR environment variable is not set!" >&2
    exit 1
fi

# Validate CIDR format (basic check)
if ! echo "${VPC_CIDR}" | grep -E '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$' > /dev/null; then
    echo "ERROR: VPC_CIDR format is invalid: ${VPC_CIDR}" >&2
    exit 1
fi

echo "✓ VPC_CIDR validation successful: ${VPC_CIDR}" >&2

# Let envsubst process the template
echo "Processing nginx configuration template..." >&2
envsubst '${VPC_CIDR}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Generated nginx config:" >&2
echo "--- /etc/nginx/conf.d/default.conf ---" >&2
head -20 /etc/nginx/conf.d/default.conf | grep -A5 -B5 "set_real_ip_from" >&2
echo "--- End of config snippet ---" >&2

# Test nginx configuration
echo "Testing nginx configuration..." >&2
nginx -t

# Start nginx
echo "Starting nginx..." >&2
exec nginx -g "daemon off;"