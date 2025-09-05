#!/bin/bash
set -e

echo "=== Database Migration Script ==="

# Environment variables logging
echo "DB_HOST=${DB_HOST:-unset}"
echo "DB_PORT=${DB_PORT:-unset}" 
echo "DB_DATABASE=${DB_DATABASE:-unset}"
echo "DB_USERNAME=${DB_USERNAME:-unset}"

# Laravel config clear (for dynamic environment)
echo "Clearing Laravel config cache..."
php artisan config:clear

# Run migrations
echo "Running database migrations..."
php artisan migrate --force

# Run seeders if specified
if [ "${RUN_SEEDERS:-false}" = "true" ]; then
    echo "Running database seeders..."
    php artisan db:seed --force
else
    echo "Skipping seeders (RUN_SEEDERS=${RUN_SEEDERS:-false})"
fi

echo "✓ Migration completed successfully"