FROM node:18-alpine

RUN mkdir -p /usr/share/localstack-security/
WORKDIR /usr/share/localstack-security

EXPOSE 4387

COPY config.json .
COPY dist .

ENTRYPOINT [ "node", "./index.js" ]