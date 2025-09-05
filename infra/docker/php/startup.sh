#!/bin/sh

# 本番環境用起動スクリプト
echo "Starting Laravel application..."

# RDS接続待機（本番環境用）
echo "Waiting for database connection..."
until php artisan tinker --execute="DB::connection()->getPdo();" 2>/dev/null; do
  echo "Database not ready, waiting..."
  sleep 2
done
echo "Database connection established!"

# Redis接続確認
echo "Checking Redis connection..."
timeout 10 php artisan tinker --execute="Redis::ping();" || echo "Redis connection failed, continuing..."

# Laravel本番起動処理
php artisan optimize:clear
php artisan migrate --force

# PHP-FPM起動
echo "Starting PHP-FPM..."
php-fpm