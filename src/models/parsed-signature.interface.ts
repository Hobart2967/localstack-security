import { CredentialInfo } from './credential-info.interface';

export interface ParsedSignature {
  signedHeaders: string[];
  signature: string;
  credential: CredentialInfo
}