# Securing localstack instances

![](./idea.excalidraw.svg)

## Requirements

- This project
- Either docker or a node.js-enabled environment

## Setup

### Configure localstack reverse proxy

Exchange your reverse proxy configuration in nginx, replacing forwarding to localstack. Instead, you'll now forward to the docker image / service you just installed.

```conf
location / {
	proxy_set_header Host cloud.codewyre.net;
	proxy_set_header X-Forwarded-For $remote_addr;
	proxy_pass http://127.0.0.1:4387;
}
```

### Configure forwarding from the authorizer service

In config.json, configure the property `logLevel` (debug > info > warn > error), `localStackUri` and `accessKeys` to your needs.

The property whitelistedUris is a list of Regex patterns that allow requests to be directly passed to LocalStack without any verification. This is useful for allowing customer-based configurations, e.g. ApiGateways available to the public.


## Example config using docker:

```yaml
version: "3.8"
services:
  localstack:
    image: gresau/localstack-persist # instead of localstack/localstack
    environment:
      SKIP_SSL_CERT_DOWNLOAD: 1
    volumes:
      - "./my-localstack-data:/persisted-data"
    networks:
      - backend
  localstack-security:
    image: hobart2967/localstack-security # or just 'localstack-security' if built locally using `yarn build`
    volumes:
      - "./config.json:/usr/share/localstack-security/config.json"
    networks:
      - backend
  nginx:
    image: nginx
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/proxy.conf
    networks:
      - backend
      - frontend
    ports:
      - 8675:8675

networks:
  backend:
    internal: true
  frontend:
    internal: false
```