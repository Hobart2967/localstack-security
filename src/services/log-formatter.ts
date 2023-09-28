import chalk from 'chalk';
import { TransformableInfo } from 'logform';
import { LoggerOptions, format, transports } from 'winston';

export function logFormatter(level: string, message: string): string {
  const levelMap: { [level: string]: ((input: string) => string) } = {
    'debug': (str: string) => chalk.hex('69159e')(str),
    'info': (str: string) => chalk.blueBright(str),
    'warn': (str: string) => chalk.yellow(str),
    'error': (str: string) => chalk.red(str)
  };

  const formatter = levelMap[level] || ((str: string) => str);

  return formatter(message);
}

export function createLogDefaultOptions(logLevel: string, handler: (info: TransformableInfo) => string): LoggerOptions {
  return {
    level: logLevel,
    format: format.combine(
      format.timestamp(),
      format.printf(handler)
    ),
    transports: [
      new transports.Console()
    ]
  };
}