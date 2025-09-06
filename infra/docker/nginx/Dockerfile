# =============================================================================
# ベースステージ - 共通の環境設定
# =============================================================================
FROM nginx:1.21.1-alpine AS base

# curlをヘルスチェック用にインストール
RUN apk add --no-cache curl

# =============================================================================
# 開発ステージ - docker-compose用
# =============================================================================
FROM base AS development

# 開発環境用のnginx設定ファイルをコピー
COPY infra/docker/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# =============================================================================
# 本番ステージ - ECS用
# =============================================================================
FROM base AS production

# ECS用のnginx設定テンプレートをコピー
COPY infra/docker/nginx/default-ecs.conf.template /etc/nginx/templates/default.conf.template
COPY infra/docker/nginx/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80

CMD ["/usr/local/bin/entrypoint.sh"]