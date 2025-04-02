import type { ServerMemberFindOneByEmailOrDiscordIdLibRequest as Req } from '@some-tools/shared/api/types';
import { type ExpressRequestHandler } from '@some-tools/shared/utils/backend/common';
import { unwrapMapResult } from '@some-tools/shared/utils/try-fail';

import { serverMemberFindOneByEmailOrDiscordId } from '../shared';

export const findServerMemberByEmailOrDiscordIdHandler: ExpressRequestHandler<Req> = async (req: Req, res, next) => {
  try {
    const result = await serverMemberFindOneByEmailOrDiscordId(req.params.emailOrDiscordId);
    return unwrapMapResult(result, {
      ifOk: (serverMember) => res.json(serverMember),
      ifFail: (fault) => res.status(fault.httpStatus).json(fault),
    });
  } catch (error) {
    return next(error);
  }
};
