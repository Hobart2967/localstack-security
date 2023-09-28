import { Application, NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { WebServer } from './services/web-server.symbol';
import { UuidService } from './services/uuid.service';
import { RequestWithContext } from './models/request-with-context.model';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Configuration } from './models/configuration.interface';
import { RequestVerificationService } from './services/request-verification.service';

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

    this.setupRequestLogging();
    this.setupKeyVerification();

    this._webServer.listen(this._config.port, () => this._logger.info(`LocalStack security layer is running! http://localhost:${this._config.port}`))
  }
  //#endregion

  //#region Private Methods
  private setupKeyVerification(): void {
    const proxyMw = createProxyMiddleware({
      target: this._config.localStackUri,
      changeOrigin: true,
      ws: true
    });

    this._webServer.use('/', (req, res, next) =>
      this._requestVerificationService.handle(req as RequestWithContext, res, next, proxyMw));
  }

  private setupRequestLogging(): void {
    this._webServer.use((req: Request, response: Response, next: NextFunction) => {
      const request = req as RequestWithContext;
      request.requestId = this._uuidService.create();
      const prefix = `[${request.requestId}] [${request.method} ${request.path}] [${request.headers['x-forwarded-for'] || request.socket.remoteAddress}]`;

      this._logger.info(`${prefix} START`);
      this._logger.debug(`${prefix} HTTP Headers received: ${JSON.stringify(request.headers)}`);
      this._logger.debug(`${prefix} Query Parameters received: ${JSON.stringify(request.query)}`);

      response.on("finish", () => {
        this._logger.info(`${prefix} END with ${response.statusCode}`);
        this._logger.debug(`${prefix} ${JSON.stringify(response.headersSent)}`);
      });

      next();
    });
  }
  //#endregion
}