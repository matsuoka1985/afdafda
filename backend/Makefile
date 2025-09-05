# Makefile for Laravel Docker Setup

# 環境変数
DB_HOST ?= mysql
DB_ROOT_PASSWORD ?= root

setup:
	@echo "=== Laravel Setup Start ==="

	# ─── ensure cache dir ───
	mkdir -p bootstrap/cache

	# ─── ensure storage framework dirs ───
	mkdir -p storage/framework/cache
	mkdir -p storage/framework/sessions
	mkdir -p storage/framework/testing
	mkdir -p storage/framework/views
	mkdir -p storage/logs
	touch storage/logs/laravel.log || true

	# ─── permissions for web user (php-fpm) ───
	chmod -R ug+rwx storage bootstrap/cache
	-chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
	-chgrp -R www-data storage bootstrap/cache 2>/dev/null || true

	# ─── Composer Install ───
	composer install --no-interaction --prefer-dist

	# ─── NPM Install (if needed) ───
	@if [ ! -d node_modules ]; then \
		echo "Installing npm dependencies..."; \
		npm install --loglevel=error; \
	fi

	# ─── Vite Build ───
	npm run build

	# ─── .env & APP_KEY ───
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		php artisan key:generate --ansi; \
	fi

	# ─── .env.testing ───
	@if [ ! -f .env.testing ]; then \
		cp .env.testing.example .env.testing 2>/dev/null || cp .env .env.testing; \
		php artisan key:generate --env=testing --ansi; \
	fi


	# ─── migrate & seed (production) ───
	php artisan migrate --force
	php artisan db:seed --force

	# ─── migrate & seed (testing) ───
	mysql --ssl=0 -h$(DB_HOST) -uroot -p$(DB_ROOT_PASSWORD) \
		-e "CREATE DATABASE IF NOT EXISTS \`demo_test\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
	php artisan migrate --env=testing --force
	php artisan config:clear

	# ─── storage link & permissions ───
	php artisan storage:link

	@echo "=== Laravel Setup Complete ==="
