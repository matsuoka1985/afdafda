#!/bin/bash

set -eu

echo "=== Database Migration Script ==="
echo "DB_HOST=$DB_HOST"
echo "DB_PORT=$DB_PORT"
echo "DB_DATABASE=$DB_DATABASE"

# DNS Resolution Test
echo "1. Testing DNS resolution for $DB_HOST"
if getent hosts "$DB_HOST"; then
    echo "✓ DNS resolution successful"
else
    echo "✗ DNS resolution failed for $DB_HOST"
    exit 1
fi

# TCP Connection Test
echo "2. Testing TCP connection to $DB_HOST:$DB_PORT"
if nc -z -w10 "$DB_HOST" "$DB_PORT"; then
    echo "✓ TCP connection successful to $DB_HOST:$DB_PORT"
else
    echo "✗ TCP connection failed to $DB_HOST:$DB_PORT"
    exit 1
fi

echo "3. Testing MySQL authentication"
php artisan tinker --execute="
try {
    \DB::connection()->getPdo();
    echo '✓ MySQL authentication successful' . PHP_EOL;
} catch (Exception \$e) {
    echo '✗ MySQL authentication failed: ' . \$e->getMessage() . PHP_EOL;
    exit(1);
}"

echo "4. Running migrations"
php artisan migrate --force --no-interaction

echo "✓ Migration completed successfully"