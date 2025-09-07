#!/bin/bash
set -e

echo "=== Laravel SNS App Production Deployment ==="

# Environment variables logging
echo "DB_HOST=${DB_HOST:-unset}"
echo "DB_PORT=${DB_PORT:-unset}" 
echo "DB_DATABASE=${DB_DATABASE:-unset}"
echo "REDIS_HOST=${REDIS_HOST:-unset}"
echo "SESSION_DRIVER=${SESSION_DRIVER:-unset}"

# Firebase認証情報ファイル作成
if [ ! -z "$FIREBASE_CREDENTIALS" ]; then
  echo "Creating Firebase credentials file..."
  mkdir -p /var/www/storage/app/firebase
  echo "$FIREBASE_CREDENTIALS" | base64 -d > /var/www/storage/app/firebase/firebase-adminsdk.json
  echo "✓ Firebase credentials file created"
else
  echo "⚠ FIREBASE_CREDENTIALS not provided"
fi

# DNS Resolution Test for Database
echo "1. Testing DNS resolution for $DB_HOST"
if getent hosts "$DB_HOST"; then
    echo "✓ DNS resolution successful"
else
    echo "✗ DNS resolution failed for $DB_HOST"
    exit 1
fi

# TCP Connection Test for Database
echo "2. Testing TCP connection to $DB_HOST:$DB_PORT"
if nc -z -w10 "$DB_HOST" "$DB_PORT"; then
    echo "✓ TCP connection successful to $DB_HOST:$DB_PORT"
else
    echo "✗ TCP connection failed to $DB_HOST:$DB_PORT"
    exit 1
fi

# Laravel config clear
echo "3. Clearing Laravel config cache for production..."
php artisan config:clear

# Redis Connection Test
echo "4. Testing Redis connection"
if [ "${SESSION_DRIVER:-}" = "redis" ] && [ "${REDIS_HOST:-}" != "unset" ]; then
    php -r "
    try {
        \$redis = new Redis();
        \$redis->connect('${REDIS_HOST}', ${REDIS_PORT:-6379});
        \$redis->set('startup_test', 'success_' . time());
        \$result = \$redis->get('startup_test');
        echo '✓ Redis connection successful: ' . \$result . PHP_EOL;
        \$redis->del('startup_test');
    } catch (Exception \$e) {
        echo '✗ Redis connection failed: ' . \$e->getMessage() . PHP_EOL;
    }
    "
else
    echo "Skipping Redis test (SESSION_DRIVER=${SESSION_DRIVER:-unset})"
fi

echo "✓ All connectivity tests passed"
echo "5. Starting PHP-FPM"
php-fpm