FROM node:14.15.4-alpine
MAINTAINER Amydin S

ENV PORT=1717 \
    NODE_ENV="production" \
    DEBUG="*,-nodemon*,-snapdragon*,-express*,-ioredis*,-body-parser*,-puppeteer*"

WORKDIR /app
COPY . /app
RUN npm install --production

USER root
RUN apk update
RUN apk upgrade
RUN apk add bash curl wget ca-certificates

RUN chown -R node:node /app
EXPOSE 1717
CMD [ "npm", "start" ]