import { inject, injectable } from 'inversify';
import { Configuration } from '../models/configuration.interface';
import { Logger } from 'winston';

@injectable()
export class CredentialService {
  //#region Ctor
  public constructor(
    @inject(Logger)
    private _logger: Logger,

    @inject('config')
    private readonly _config: Configuration) { }
  //#endregion

  //#region Public Methods
  public resolveSecretKey(accessKeyId: string): string {
    const secretAccessKey = this._config.accessKeys[accessKeyId];
    if (!secretAccessKey) {
      this._logger.error(`Invalid access key supplied (${accessKeyId})`);
      throw new Error('Invalid access key supplied!');
    }

    return secretAccessKey;
  }
  //#endregion
}