# =============================================================================
# ベースステージ - 共通の環境設定
# =============================================================================
FROM php:8.2.28-fpm-alpine AS base

# ---------- PHP 拡張 -----------
RUN apk add --no-cache icu-dev zlib-dev libzip-dev oniguruma-dev mysql-client \
  && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
  && docker-php-ext-install pdo_mysql zip intl bcmath mbstring \
  && pecl install apcu redis \
  && docker-php-ext-enable apcu redis \
  && apk del .build-deps

# ---------- Composer ----------
RUN curl -sS https://getcomposer.org/installer | php -- \
  --install-dir=/usr/local/bin --filename=composer

WORKDIR /var/www

# =============================================================================
# 開発ステージ - 開発用ツール含む
# =============================================================================
FROM base AS development

# ---------- 開発用ツール ----------  
RUN apk add --no-cache bash make nodejs npm

# 開発用: ボリュームマウントでコードを注入するため、COPYしない

# =============================================================================
# 本番ステージ - 最適化済み
# =============================================================================
FROM base AS production

# Node.js をインストール（Vite ビルド用）
RUN apk add --no-cache nodejs npm

# backendディレクトリをコピー
COPY backend/ /var/www/

# ディレクトリ準備（make setupと同様）
RUN mkdir -p bootstrap/cache \
    && mkdir -p storage/framework/cache \
    && mkdir -p storage/framework/sessions \
    && mkdir -p storage/framework/testing \
    && mkdir -p storage/framework/views \
    && mkdir -p storage/logs \
    && touch storage/logs/laravel.log

# Composer依存関係インストール（本番用）
RUN composer install --no-dev --optimize-autoloader --no-interaction

# NPM install & Vite build（make setupと同様）
# npm レジストリ設定とリトライ処理
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fund false && \
    npm config set audit false && \
    npm cache clean --force && \
    (npm install --no-fund --no-audit || \
     (echo "First npm install failed, retrying..." && sleep 10 && npm install --no-fund --no-audit) || \
     (echo "Second npm install failed, retrying with different registry..." && npm config set registry https://registry.yarnpkg.com/ && npm install --no-fund --no-audit)) && \
    npm run build

# .env準備（本番用は環境変数で上書き予定。）
RUN cp .env.example .env

# Firebase認証情報ファイル作成（環境変数から）
RUN mkdir -p storage/app/firebase

# 起動スクリプトをコピー
COPY infra/docker/php/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Laravel最適化（セットアップ後に実行）
RUN php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

# storage link作成
RUN php artisan storage:link

# 権限設定
RUN chmod -R ug+rwx storage bootstrap/cache \
    && chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

# ヘルスチェック用エンドポイント
RUN echo '<?php echo "OK";' > /var/www/public/health

# 権限設定は既に上で実行済み

USER www-data

EXPOSE 9000

CMD ["/usr/local/bin/start.sh"]
