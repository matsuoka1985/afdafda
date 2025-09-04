#!/bin/bash
set -e

echo "Starting Laravel application..."

# Wait for database connection
echo "Waiting for database connection to $DB_HOST:$DB_PORT..."
timeout=60
count=0

while ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
    if [ $count -ge $timeout ]; then
        echo "Timeout waiting for $DB_HOST:$DB_PORT"
        exit 1
    fi
    echo "Waiting for $DB_HOST:$DB_PORT... ($count/$timeout)"
    sleep 2
    count=$((count + 2))
done

echo "Database connection available at $DB_HOST:$DB_PORT"

# Clear config cache
php artisan config:clear --no-interaction

# Run migrations if needed
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "Running database migrations..."
    php artisan migrate --force --no-interaction || {
        echo "Migration failed, but continuing..."
    }
fi

# Start PHP-FPM
echo "Starting PHP-FPM..."
exec php-fpm -F