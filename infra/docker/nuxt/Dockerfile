FROM node:20-alpine

WORKDIR /app

# 必要なパッケージのインストール
RUN apk update \
  && apk add --no-cache bash

EXPOSE 3000
CMD ["npm","run","dev"]