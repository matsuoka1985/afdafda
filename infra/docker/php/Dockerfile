FROM php:8.1-fpm-bookworm
LABEL maintainer="ucan-lab <yes@u-can.pro>"
SHELL ["/bin/bash", "-oeux", "pipefail", "-c"]

# timezone / locale / composer env
ENV TZ=UTC \
  LANG=en_US.UTF-8 \
  LC_ALL=en_US.UTF-8 \
  COMPOSER_ALLOW_SUPERUSER=1 \
  COMPOSER_HOME=/composer

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# packages + locales + php extensions
RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends \
    git unzip libicu-dev libzip-dev locales; \
  sed -i 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen; \
  locale-gen; update-locale LANG="$LANG" LC_ALL="$LC_ALL"; \
  mkdir -p /var/run/php-fpm; \
  docker-php-ext-install intl pdo_mysql zip bcmath; \
  pecl install -o -f redis; \
  docker-php-ext-enable redis; \
  composer config -g process-timeout 3600; \
  composer config -g repos.packagist composer https://packagist.org; \
  rm -rf /var/lib/apt/lists/*

COPY ./infra/docker/php/php-fpm.d/zzz-www.conf /usr/local/etc/php-fpm.d/zzz-www.conf
COPY ./infra/docker/php/php.ini /usr/local/etc/php/php.ini

COPY --chown=www-data:www-data ./backend /work/backend

WORKDIR /work/backend
