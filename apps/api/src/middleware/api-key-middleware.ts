import type { NextFunction, Request, Response } from 'express';

import { makeUnidentifiedFault } from '@some-tools/shared/utils/common';

import { API_KEY_ISSUED_TO_CODING_DOJO, API_KEY_ISSUED_TO_LOCAL, API_KEY_ISSUED_TO_TA_BUDDY } from '../environments';

const bearerApiKeys = {
  [API_KEY_ISSUED_TO_CODING_DOJO]: {
    label: 'Coding Some',
    issuedOn: new Date('09-06-2023 05:33:07'),
  },
  [API_KEY_ISSUED_TO_LOCAL]: {
    label: 'local',
    issuedOn: new Date('09-06-2023 05:27:59'),
  },
  [API_KEY_ISSUED_TO_TA_BUDDY]: {
    label: 'TA Buddy',
    issuedOn: new Date('09-08-2023 01:48:25'),
  },
};

/**
 * Required header format:
 * ```
 * Authorization: `Bearer ${apiKey}`
 * ```
 */
export const validateBearerApiKey = (req: Request, res: Response, next: NextFunction) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res.status(401).json(makeUnidentifiedFault(new Error('Unauthorized api access. Missing api key.')));
  }

  if (!authorizationHeader.startsWith('Bearer ')) {
    return res.status(401).json(makeUnidentifiedFault(new Error('Unauthorized api access. Invalid api key format.')));
  }

  const apiKey = authorizationHeader.slice('Bearer '.length);

  if (!(apiKey in bearerApiKeys)) {
    return res.status(401).json(makeUnidentifiedFault(new Error('Unauthorized api access. Invalid api key.')));
  }

  return next();
};
