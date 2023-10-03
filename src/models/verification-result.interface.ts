import { ParsedSignature } from './parsed-signature.interface';

export interface VerificationResult {
  status: number;
  body?: any;
  result: ParsedSignature | null;
}