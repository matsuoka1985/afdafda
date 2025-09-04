#!/bin/bash

set -eu

echo "=== ECS Production Startup ==="
echo "DB_HOST=$DB_HOST"

# DNS and TCP check
echo "Checking DB connection to $DB_HOST:$DB_PORT"
if ! nc -z -w10 "$DB_HOST" "$DB_PORT"; then
    echo "✗ Cannot connect to $DB_HOST:$DB_PORT"
    exit 1
fi
echo "✓ DB connection successful"

php artisan config:cache

php-fpm
