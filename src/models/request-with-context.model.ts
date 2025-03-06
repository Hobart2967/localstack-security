import { Request } from 'express';

export interface RequestWithContext extends Request {
  rawBodyStr: string;
  rawBody: Buffer;
	requestId: string;
}
