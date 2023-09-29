FROM node:18-alpine

RUN mkdir -p /usr/share/localstack-security/
WORKDIR /usr/share/localstack-security

COPY dist .
COPY config.json .

ENTRYPOINT [ "node", "./index.js" ]