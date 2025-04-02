import type { NextFunction, Request, Response } from 'express';

import { makeUnidentifiedFault } from '@some-tools/shared/utils/common';

export const errorHandler = (error: unknown, _req: Request, res: Response, next: NextFunction) => {
  console.error('api catch all error handler:', error);

  if (res.headersSent) {
    return next(error);
  }

  const unidentifiedError = makeUnidentifiedFault(error);
  return res.status(500).json(unidentifiedError);
};
