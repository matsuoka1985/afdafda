#!/bin/bash
set -e

echo "=== Laravel DB Connection Debug ==="
echo "DB_HOST=$DB_HOST"
echo "DB_PORT=$DB_PORT"
echo "DB_DATABASE=$DB_DATABASE"
echo "DB_USERNAME=$DB_USERNAME"
echo "DB_SOCKET=$DB_SOCKET"

# 1. DNS Resolution
echo "1. Testing DNS resolution for $DB_HOST"
if getent hosts "$DB_HOST"; then
    echo "✓ DNS resolution successful"
else
    echo "✗ DNS resolution failed"
fi

# 2. TCP Connection
echo "2. Testing TCP connection to $DB_HOST:$DB_PORT"
timeout=60
count=0

while ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
    if [ $count -ge $timeout ]; then
        echo "✗ TCP connection timeout to $DB_HOST:$DB_PORT"
        exit 1
    fi
    echo "Waiting for $DB_HOST:$DB_PORT... ($count/$timeout)"
    sleep 2
    count=$((count + 2))
done

echo "✓ TCP connection successful to $DB_HOST:$DB_PORT"

# 3. Laravel Config Test
echo "3. Testing Laravel database config"
php artisan config:clear --no-interaction
php artisan tinker --execute="
try {
    echo '✓ Laravel config loaded' . PHP_EOL;
    \$config = config('database.connections.mysql');
    echo 'Host: ' . \$config['host'] . PHP_EOL;
    echo 'Database: ' . \$config['database'] . PHP_EOL;
    echo 'Socket: ' . (\$config['unix_socket'] ?: 'empty') . PHP_EOL;
} catch (Exception \$e) {
    echo '✗ Laravel config error: ' . \$e->getMessage() . PHP_EOL;
}"

# 4. MySQL Connection Test
echo "4. Testing MySQL authentication"
php artisan tinker --execute="
try {
    \DB::connection()->getPdo();
    echo '✓ MySQL authentication successful' . PHP_EOL;
    echo 'Server version: ' . \DB::select('SELECT VERSION() as version')[0]->version . PHP_EOL;
} catch (Exception \$e) {
    echo '✗ MySQL authentication failed: ' . \$e->getMessage() . PHP_EOL;
}"

# 5. Database Existence Test
echo "5. Testing database existence"
php artisan tinker --execute="
try {
    \DB::statement('USE ' . config('database.connections.mysql.database'));
    echo '✓ Database exists and accessible' . PHP_EOL;
} catch (Exception \$e) {
    echo '✗ Database access failed: ' . \$e->getMessage() . PHP_EOL;
    echo 'Trying to list databases...' . PHP_EOL;
    try {
        \$dbs = \DB::select('SHOW DATABASES');
        echo 'Available databases: ' . implode(', ', array_column(\$dbs, 'Database')) . PHP_EOL;
    } catch (Exception \$e2) {
        echo 'Cannot list databases: ' . \$e2->getMessage() . PHP_EOL;
    }
}"

# Run migrations if needed
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "6. Running database migrations..."
    php artisan migrate --force --no-interaction || {
        echo "✗ Migration failed"
        exit 1
    }
    echo "✓ Migrations completed"
fi

# Start PHP-FPM
echo "=== Starting PHP-FPM ==="
exec php-fpm -F