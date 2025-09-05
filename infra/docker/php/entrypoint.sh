#!/bin/bash
set -e

echo "=== ECS Production Startup ==="

# Check if running in CI environment
if [ "${CI:-false}" = "true" ]; then
    echo "Running in CI environment, skipping all DB checks"
    exec php-fpm -F
fi

echo "Running in production environment"
echo "DB_HOST=${DB_HOST:-unset}"
echo "DB_PORT=${DB_PORT:-unset}"
echo "DB_DATABASE=${DB_DATABASE:-unset}"
echo "DB_USERNAME=${DB_USERNAME:-unset}"
echo "DB_SOCKET=${DB_SOCKET:-unset}"
echo "REDIS_HOST=${REDIS_HOST:-unset}"
echo "SESSION_DRIVER=${SESSION_DRIVER:-unset}"

# Skip DB checks in CI environment  
if [ "${CI:-false}" = "true" ] || [ "${RUN_MIGRATIONS:-true}" = "false" ]; then
    echo "Skipping DB checks in CI environment"
else
    # 1. DNS Resolution
    echo "1. Testing DNS resolution for $DB_HOST"
    if getent hosts "$DB_HOST"; then
        echo "✓ DNS resolution successful"
    else
        echo "✗ DNS resolution failed"
        exit 1
    fi

    # 2. TCP Connection
    echo "2. Testing TCP connection to $DB_HOST:$DB_PORT"
    if nc -z -w10 "$DB_HOST" "$DB_PORT" 2>/dev/null; then
        echo "✓ TCP connection successful to $DB_HOST:$DB_PORT"
    else
        echo "✗ TCP connection failed to $DB_HOST:$DB_PORT"
        exit 1
    fi
fi

# Laravel config and DB tests (only in production)
if [ "${CI:-false}" = "true" ] || [ "${RUN_MIGRATIONS:-true}" = "false" ]; then
    echo "Skipping Laravel DB tests in CI environment"
else
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

    # 7. Redis Connection Test
    echo "7. Testing Redis connection"
    if [ "${SESSION_DRIVER:-}" = "redis" ] && [ "${REDIS_HOST:-}" != "unset" ]; then
        php artisan tinker --execute="
        try {
            \$redis = new Redis();
            \$redis->connect('${REDIS_HOST}', ${REDIS_PORT:-6379});
            \$redis->set('startup_test', 'success_' . time());
            \$result = \$redis->get('startup_test');
            echo '✓ Redis connection successful: ' . \$result . PHP_EOL;
            \$redis->del('startup_test');
        } catch (Exception \$e) {
            echo '✗ Redis connection failed: ' . \$e->getMessage() . PHP_EOL;
        }"
    else
        echo "Skipping Redis test (SESSION_DRIVER=${SESSION_DRIVER:-unset})"
    fi
fi

# Run migrations if needed (skip in CI)
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