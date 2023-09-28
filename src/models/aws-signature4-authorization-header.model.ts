export interface AwsSignature4AuthorizationHeader {
  Credential: string;
  SignedHeaders: string;
  Signature: string
}