import express, { Application } from 'express';
import { Container, interfaces } from 'inversify';
import { WebServer } from '../services/web-server.symbol';
import { Logger, createLogger } from 'winston';
import { App } from '../app';
import fs from 'fs';
import path from 'path';
import { sign } from 'aws4';
import { UuidService } from '../services/uuid.service';
import { CredentialService } from '../services/credential.service';
import { RequestVerificationService } from '../services/request-verification.service';
import { SignatureParserService } from '../services/signature-parser.service';
import { SignatureService } from '../services/signature.service';
import { createLogDefaultOptions, logFormatter } from '../services/log-formatter';
import { Configuration } from '../models/configuration.interface';

const getClassNameFromRequest = (context: interfaces.Context) =>
  (context.currentRequest.parentRequest &&
    context.currentRequest.parentRequest.bindings.length &&
    context.currentRequest.parentRequest.bindings[0].implementationType &&
    (context.currentRequest.parentRequest.bindings[0].implementationType as any)
      .name) ||
  'Unknown';

const container = new Container();
container
  .bind('aws4')
  .toConstantValue(sign);

const config: Configuration = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'config.json')).toString())
container
  .bind('config')
  .toConstantValue(config);
container
  .bind('loglevel')
  .toConstantValue(config.logLevel || 'info');

container
  .bind<Application>(WebServer)
  .toConstantValue(express());

container.bind(CredentialService).toSelf();
container.bind(RequestVerificationService).toSelf();
container.bind(SignatureParserService).toSelf();
container.bind(SignatureService).toSelf();
container.bind(UuidService).toSelf();

container
  .bind<Logger>(Logger)
  .toDynamicValue((context: interfaces.Context) => {
    const contextName = getClassNameFromRequest(context);

    const logger = createLogger(
      createLogDefaultOptions(
        config.logLevel, (info) => {
          const { timestamp, level, message } = info;
          return logFormatter(level, `[${timestamp}] [${level}] [${contextName}]: ${message}`);
        }));

    return logger;
  });

container.bind(App).toSelf();
export { container };