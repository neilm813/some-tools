import {
  type DiscordServerMember,
  type MongooseServerMember,
  type ServerMemberCreateOneLibRequest as Req,
  type ServerMemberCreateOneRouteInfo as RouteInfo,
} from '@some-tools/shared/api/types';
import {
  type DbCreateOneFault,
  type ExpressRequestHandler,
  mapDbCreateOneFaults,
} from '@some-tools/shared/utils/backend/common';
import { type Result, tryFailAsync, unwrapMapResult } from '@some-tools/shared/utils/try-fail';

import { ServerMember } from '../shared';

const createOneServerMember = async (
  payload: RouteInfo['req']['body']
): Promise<Result<MongooseServerMember, DbCreateOneFault<DiscordServerMember>>> =>
  tryFailAsync(async () => ServerMember.create(payload), mapDbCreateOneFaults<DiscordServerMember>);

export const createOneServerMemberHandler: ExpressRequestHandler<Req> = async (req: Req, res, next) => {
  try {
    const result = await createOneServerMember(req.body);
    return unwrapMapResult(result, {
      ifOk: (serverMember) => res.json(serverMember),
      ifFail: (fault) => res.status(fault.httpStatus).json(fault),
    });
  } catch (error) {
    return next(error);
  }
};
