import type { sign, Request } from 'aws4';
import { inject, injectable } from 'inversify';

@injectable()
export class SignatureService {
  //#region Ctor
  public constructor(
    @inject('aws4')
    private readonly _signRequest: typeof sign) { }
  //#endregion

  //#region Public Methods
  public signRequestData(accessKeyId: string, secretAccessKey: string, requestInfo: Request) {
    return this._signRequest(requestInfo, {
      accessKeyId, secretAccessKey
    });
  }
  //#endregion
}