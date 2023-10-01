import { Request } from 'express';

export interface RequestWithContext extends Request {
  rawBody: string;
	requestId: string;
}
