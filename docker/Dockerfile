FROM node:18-alpine

RUN mkdir -p /usr/share/localstack-security/
WORKDIR /usr/share/localstack-security

COPY dist .
COPY config.json .

EXPOSE 4387

ENTRYPOINT [ "node", "./index.js" ]