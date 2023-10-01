import { RequestMapper } from './request-mapper.interface';

export interface Configuration {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  localStackUri: string;
  whitelistedUris: string[];
  port: number;
  requestMappers: RequestMapper[];
  accessKeys: { [index: string]: string }
}