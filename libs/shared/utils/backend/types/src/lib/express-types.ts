import type { Request, Response, NextFunction } from 'express';

export type ExpressRequestHandler<ReqT extends Request> = (
  req: ReqT,
  res: NonNullable<ReqT['res']>,
  next: NextFunction
) => Promise<ReqT['res'] | void>;
