#!/bin/sh
set -e

echo "=== Laravel SNS App Startup ==="

# Environment variables logging
echo "DB_HOST=${DB_HOST:-unset}"
echo "DB_PORT=${DB_PORT:-unset}" 
echo "DB_DATABASE=${DB_DATABASE:-unset}"
echo "REDIS_HOST=${REDIS_HOST:-unset}"
echo "SESSION_DRIVER=${SESSION_DRIVER:-unset}"

# Firebase認証情報ファイル作成
if [ ! -z "$FIREBASE_CREDENTIALS" ]; then
  echo "Creating Firebase credentials file..."
  echo "$FIREBASE_CREDENTIALS" | base64 -d > /var/www/storage/app/firebase/firebase-adminsdk.json
  echo "✓ Firebase credentials file created"
else
  echo "⚠ FIREBASE_CREDENTIALS not provided"
fi

# Laravel optimization clear (本番環境では動的設定が必要)
echo "Clearing Laravel caches for production..."
php artisan config:clear
php artisan route:clear 
php artisan view:clear
php artisan cache:clear

# Storage linkの再作成（本番環境で必要）
echo "Creating storage link..."
php artisan storage:link --force

# マイグレーション実行
echo "Running database migrations..."
php artisan migrate --force

# シーディング実行（本番環境では条件付き）
if [ "${RUN_SEEDERS:-false}" = "true" ]; then
  echo "Running database seeders..."
  php artisan db:seed --force
else
  echo "Skipping seeders (RUN_SEEDERS=${RUN_SEEDERS:-false})"
fi

# 権限確認・修正
echo "Setting proper permissions..."
chmod -R ug+rwx storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

echo "✓ Laravel SNS App startup complete"

# PHP-FPM起動
exec php-fpm -F