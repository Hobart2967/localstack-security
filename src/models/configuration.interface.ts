export interface Configuration {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  localStackUri: string;
  whitelistedUris: string[];
  port: number;
  accessKeys: { [index: string]: string }
}