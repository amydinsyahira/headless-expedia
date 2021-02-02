FROM node:14.15.4-alpine
MAINTAINER Amydin S

ENV CHROME_BIN="/usr/bin/chromium-browser" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"

ENV PORT=1717 \
    NODE_ENV="production" \
    DEBUG="*,-nodemon*,-snapdragon*,-express*,-ioredis*,-body-parser*,-puppeteer*"

RUN set -x \
    && apk update \
    && apk upgrade \
    && apk add --no-cache \
    udev \
    ttf-freefont \
    chromium

WORKDIR /app
COPY . /app
RUN npm install --production

EXPOSE 1717
CMD [ "npm", "start" ]