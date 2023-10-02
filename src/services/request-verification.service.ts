import { VerificationResult } from '../models/verification-result.interface';
import { inject, injectable } from 'inversify';
import { Logger, format } from 'winston';
import { RequestWithContext } from '../models/request-with-context.model';
import { SignatureParserService } from './signature-parser.service';
import { ParsedSignature } from '../models/parsed-signature.interface';
import { SignatureService } from './signature.service';
import { CredentialService } from './credential.service';
import { OutgoingHttpHeaders } from 'http2';
import { Configuration } from '../models/configuration.interface';

@injectable()
export class RequestVerificationService {
  //#region Private Fields
  private readonly unauthorized: VerificationResult = {
    status: 401,
    body: { message: 'The security token included in the request is invalid' }
  };
  private readonly noAuth: VerificationResult = {
    status: 401,
    body: { message: 'Missing authentication token' }
  };
  private readonly ok: VerificationResult = {
    status: 204
  };
  //#endregion

  //#region Ctor
  public constructor(
    @inject(Logger)
    private readonly _logger: Logger,

    @inject('config')
    private readonly _config: Configuration,

    @inject(SignatureParserService)
    private readonly _signatureParser: SignatureParserService,

    @inject(SignatureService)
    private readonly _signatureService: SignatureService,

    @inject(CredentialService)
    private readonly _credentialService: CredentialService) { }
  //#endregion

  //#region Public Method
  public handle(request: RequestWithContext): VerificationResult {
    const logger = this._logger.child({
      format: format.combine(format.timestamp())
    });

    logger.debug(`Verifying signature of incoming request`);
    return this.checkSignature(request, logger);
  }
  //#endregion

  //#region Private Methods
  private checkSignature(request: RequestWithContext, logger: Logger): VerificationResult {
    const whitelist = this._config.whitelistedUris.map(x => new RegExp(x));

    const url = request.url as string;
    const { authorization } = request.headers;

    if (whitelist.some(x => x.test(url))) {
      logger.debug('Uri has been whitelisted. Forwarding...');
      return this.ok;
    }

    if (!authorization) {
      logger.debug('No authorization header found and url has not been whitelisted.');
      return this.noAuth;
    }

    if (authorization && !authorization.startsWith('AWS4-HMAC-SHA256 ')) {
      logger.debug('Unknown authorization handling found. Uri is not whitelisted for this, so flushing a 400');
      return this.unauthorized
    }

    logger.debug('AWS4 Signature found. Counterchecking signature...', request);

    let incomingSignature: ParsedSignature
    try {
      incomingSignature = this._signatureParser.parse(request);
    } catch {
      return this.unauthorized;
    }

    const accessKeyId = incomingSignature.credential.accessKeyId;
    let secretKey: string;
    try {
      secretKey = this._credentialService.resolveSecretKey(accessKeyId);
    } catch {
      return this.unauthorized;
    }

    const headers = this.getCleansedHeaders(request, incomingSignature);

    const extraHeadersToIgnore: { [header: string]: boolean } =
      Object
        .keys(request.headers)
        .map(x => x.toLowerCase())
        .filter(x => !incomingSignature.signedHeaders.includes(x))
        .reduce((prev, cur) => ({ ...prev, [cur]: true }), {});

    if (!request.headers['content-type']) {
      extraHeadersToIgnore['content-type'] = true;
    }

    this._logger.debug('Ignored headers upon signing: ' + JSON.stringify(extraHeadersToIgnore));

    const requestData = {
      host: request.hostname,
      method: request.method,
      path: url,
      body: request.rawBody || undefined,
      service: incomingSignature.credential.service,
      headers,
      region: incomingSignature.credential.region,
      extraHeadersToIgnore
    } as any;

    this._logger.debug('Counter-Check request build: ' + JSON.stringify(requestData));

    const signedCounterCheckRequest = this._signatureService.signRequestData(
      accessKeyId,
      secretKey,
      requestData);

    const resultHeaders = signedCounterCheckRequest.headers as OutgoingHttpHeaders;
    if (resultHeaders['Authorization']) {
      resultHeaders['authorization'] = resultHeaders['Authorization'];
      delete resultHeaders['Authorization'];
    }

    let signedCounterCheckAuth: ParsedSignature
    try {
      signedCounterCheckAuth = this._signatureParser.parse(signedCounterCheckRequest as RequestWithContext);
    } catch {
      return this.unauthorized;
    }
    const signature = signedCounterCheckAuth.signature;

    if (signature !== incomingSignature.signature) {
      this._logger.debug(
        `Signatures do not match. This indicates a wrong signature supplied in the request.` +
        `(Incoming=${JSON.stringify(incomingSignature)};Generated=${JSON.stringify(signedCounterCheckAuth)})`);
      return this.unauthorized;
    }

    return this.ok;
  }

  private getCleansedHeaders(request: RequestWithContext, incomingSignature: ParsedSignature): OutgoingHttpHeaders {
    const cleansedHeaders: OutgoingHttpHeaders = Object.entries(request.headers)
      .filter(([header]) => incomingSignature.signedHeaders.includes(header.toLowerCase()))
      .reduce((prev, [header, value]) => ({
        ...prev,
        [header.toLowerCase()]: value
      }), {});


    this._logger.debug('Cleansed headers: ' + JSON.stringify(cleansedHeaders));

    return cleansedHeaders;
  }
  //#endregion
}