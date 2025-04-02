import type {
  DiscordServerMember,
  MongooseServerMember,
  ServerMemberUpdateOneLibRequest as Req,
  ServerMemberUpdateOneData,
  ServerMemberUpdateOneFault,
} from '@some-tools/shared/api/types';
import {
  type ExpressRequestHandler,
  makeRecordNotFoundFault,
  mapDbUpdateOneFaults,
} from '@some-tools/shared/utils/backend/common';
import { fail, isFail, ok, Result, tryFailAsync, unwrapMapResult } from '@some-tools/shared/utils/try-fail';

import { emailOrDiscordIdQuery, ServerMember } from '../shared';

const updateOne = async (
  emailOrDiscordId: string,
  updateData: ServerMemberUpdateOneData
): Promise<Result<MongooseServerMember, ServerMemberUpdateOneFault>> => {
  const result = await tryFailAsync(
    async () =>
      ServerMember.findOneAndUpdate(emailOrDiscordIdQuery(emailOrDiscordId), updateData, {
        new: true,
        runValidators: true,
      }),
    mapDbUpdateOneFaults<DiscordServerMember>
  );

  if (isFail(result)) {
    return result;
  }

  const serverMember = result.value;

  if (!serverMember) {
    return fail(makeRecordNotFoundFault());
  }

  return ok(serverMember);
};

export const updateOneServerMember: ExpressRequestHandler<Req> = async (req: Req, res, next) => {
  try {
    const result = await updateOne(req.params.emailOrDiscordId, req.body);

    unwrapMapResult(result, {
      ifOk: (serverMember) => res.json(serverMember),
      ifFail: (fault) => res.status(fault.httpStatus).json(fault),
    });
  } catch (error) {
    return next(error);
  }
};

// ! Do not update guild member from this endpoint, it would cause a loop since it's used in guild-member-update.ts
