import crypto from 'crypto';
import { injectable } from 'inversify';

@injectable()
export class UuidService {
  public create(): string {
  	return crypto.randomUUID().toString().toLowerCase();
  }
}