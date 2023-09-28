# Securing localstack instances

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





 docker run -it --name ls-security --publish 4387:4387 -e LOG_LEVEL=debug -v /root/authorizer.js:/root/authorizer.js node:19-alpine /root/authorizer.js