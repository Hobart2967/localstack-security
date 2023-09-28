import { injectable } from 'inversify';
import { AwsSignature4AuthorizationHeader } from '../models/aws-signature4-authorization-header.model';
import { CredentialInfo } from '../models/credential-info.interface';
import { ParsedSignature } from '../models/parsed-signature.interface';
import { RequestWithContext } from '../models/request-with-context.model';

@injectable()
export class SignatureParserService {
  public parse(request: RequestWithContext): ParsedSignature {
    let authorization = request.headers.authorization;
    if (!authorization) {
      throw new Error('Invalid authorization header');
    }

    const awsSignature4AuthorizationHeader = this.parseAuthorizationHeader(authorization);

    const credentialInfo: CredentialInfo = this.parseCredentialToken(awsSignature4AuthorizationHeader);

    return {
      credential: credentialInfo,
      signedHeaders: awsSignature4AuthorizationHeader.SignedHeaders.split(';'),
      signature: awsSignature4AuthorizationHeader.Signature
    };
  }

  private parseAuthorizationHeader(authorization: string) {
    authorization = authorization.replace(/^AWS4-HMAC-SHA256 /g, '');
    const entryStrings = authorization
      .split(',')
      .map(entry => entry
        .replace(/^\s*/, '')
        .replace(/\s*$/, ''));

    const partialAwsSignature4AuthorizationHeader: Partial<AwsSignature4AuthorizationHeader> = entryStrings
      .map(entry => entry.split('='))
      .reduce((prev, [key, value]) => ({
        ...prev,
        [key]: value
      }), {} as Partial<AwsSignature4AuthorizationHeader>);

    return partialAwsSignature4AuthorizationHeader as Required<AwsSignature4AuthorizationHeader>;
  }

  private parseCredentialToken(entries: { [index: string]: string; }) {
    const credentialString = entries['Credential'];
    const [accessKeyId, issuedAt, region, service] = credentialString.split('/');
    const credentialInfo: CredentialInfo = {
      accessKeyId, issuedAt, region, service
    };
    return credentialInfo;
  }
}