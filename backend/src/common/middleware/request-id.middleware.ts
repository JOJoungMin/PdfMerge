import {Request, Response, NextFunction} from 'express';
import { randomUUID } from 'crypto';
export function requestIdMiddleware(
    req:Request,
    res: Response,
    next: NextFunction,
) {
    (req as any).traceId = randomUUID();
    next();
}