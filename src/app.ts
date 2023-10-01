import express, { Application, NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { WebServer } from './services/web-server.symbol';
import { UuidService } from './services/uuid.service';
import { RequestWithContext } from './models/request-with-context.model';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { RequestMapper, RequestMapperType } from './models/request-mapper.interface';
import { RequestVerificationService } from './services/request-verification.service';
import { Configuration } from './models/configuration.interface';
import bodyParser from 'body-parser';

@injectable()
export class App {
  //#region Ctor
  public constructor(
    @inject(Logger)
    private readonly _logger: Logger,

    @inject(WebServer)
    private readonly _webServer: Application,

    @inject(UuidService)
    private readonly _uuidService: UuidService,

    @inject('config')
    private readonly _config: Configuration,

    @inject(RequestVerificationService)
    private readonly _requestVerificationService: RequestVerificationService) { }
  //#endregion

  //#region Public Methods
  public main(): void {
    this._logger.info('Starting localstack security layer... Running on log level: ' + (this._config.logLevel || 'info'));

    this.setupBodyParsing();

    this.setupRequestLogging();
    this.setupKeyVerification();
    this._webServer.listen(this._config.port, () => this._logger.info(`LocalStack security layer is running! http://localhost:${this._config.port}`))
  }
  //#endregion

  //#region Private Methods
  private setupBodyParsing() {

    this._webServer.use(async (req, res, next) => {
      const promises = [
        new Promise<void>(resolve => bodyParser.json()(req, res, resolve)),
        new Promise<void>(resolve => bodyParser.urlencoded({ extended: true })(req, res, resolve)),
        new Promise<void>(resolve => {
          var data = "";

          req.on('data', (chunk) => data += chunk)
          req.on('end', () => {
            (req as RequestWithContext).rawBody = data;
            resolve();
          });
        })
      ];

      await Promise.all(promises);
      next();
    });
  }

  private setupKeyVerification(): void {
    const proxyMw = createProxyMiddleware({
      target: this._config.localStackUri,
      changeOrigin: true,
      onProxyReq: function fixRequestBody(proxyReq, req) {
        const requestBody = (req as RequestWithContext).rawBody;
        if (!requestBody) {
            return;
        }

        proxyReq.setHeader('Content-Length', Buffer.byteLength(requestBody));
        proxyReq.write(requestBody);
      },
      ws: true
    });

    this._webServer.use('/', (request, response, next) => {
      const result = this._requestVerificationService.handle(request as RequestWithContext);

      if (result.status === 204) {
        this._logger.debug(`Signature ok, forwarding to backend.`);

        this.modifyRequest(request as RequestWithContext);

        return proxyMw(request, response, next);
      }

      this._logger.debug(`Bad signature. Rejecting request.`);
      response.setHeader('x-amzn-RequestId', (request as RequestWithContext).requestId);
      response.setHeader('Content-Type', 'application/xml');
      response.status(result.status);

      const responseText = `
        <ErrorResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
          <Error>
            <Type>Sender</Type>
            <Code>InvalidClientTokenId</Code>
            <Message>${result.body.message}</Message>
          </Error>
          <RequestId>${(request as RequestWithContext).requestId}</RequestId>
        </ErrorResponse>`;

      response.send(responseText);

      next();
    });
  }

  private modifyRequest(request: RequestWithContext) {
    const mapperProcessors = new Map<RequestMapperType, (request: RequestWithContext, mapper: RequestMapper) => void>([
      ['header', (request, mapper) => this.modifyHeader(request, mapper)],
      ['url', (request, mapper) => this.modifyUrl(request, mapper)]
    ])

    for (const mapper of this._config.requestMappers) {
      const processor = mapperProcessors.get(mapper.type);
      processor!(request, mapper);
    }
  }

  private modifyUrl(request: RequestWithContext, mapper: RequestMapper): void {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const resultingUrl = new URL(url.href.replace(mapper.match, mapper.convert));
    request.url = resultingUrl.pathname;
    request.query = Array
      .from(resultingUrl.searchParams.entries())
      .reduce((prev, [k, v]) => ({
        ...prev,
        [k]: v
      }), {});

    request.headers.host = resultingUrl.hostname;
  }

  private modifyHeader(request: RequestWithContext, mapper: RequestMapper): void {
    const value = request.headers[mapper.options!.name.toLowerCase()] as string;
    if (!value && mapper.match != null) {
      return;
    }

    if (value && mapper.match == null) {
      return;
    }

    if (mapper.match && value) {
      request.headers[mapper.options!.name.toLowerCase()] = value.replace(new RegExp(mapper.match), mapper.convert);
      return;
    }

    request.headers[mapper.options!.name.toLowerCase()] = mapper.convert;
  }

  private setupRequestLogging(): void {
    this._webServer.use((req: Request, response: Response, next: NextFunction) => {
      const request = req as RequestWithContext;
      request.requestId = this._uuidService.create();
      const prefix = `[${request.requestId}] [${request.method} ${request.path}] [${request.headers['x-forwarded-for'] || request.socket.remoteAddress}]`;

      this._logger.info(`${prefix} START`);
      this._logger.debug(`${prefix} HTTP Headers received: ${JSON.stringify(request.headers)}`);
      this._logger.debug(`${prefix} Query Parameters received: ${JSON.stringify(request.query)}`);
      this._logger.debug(`${prefix} Body received (RAW): ${request.rawBody}`);
      this._logger.debug(`${prefix} Body received: ${JSON.stringify(request.body)}`);

      response.on("finish", () => {
        this._logger.info(`${prefix} END with ${response.statusCode}`);
        this._logger.debug(`${prefix} ${JSON.stringify(response.headersSent)}`);
      });

      next();
    });
  }
  //#endregion
}