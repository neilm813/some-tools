import {
  type DiscordServerMember,
  type ServerMemberUpdateOneAndLinkedGuildMemberLibRequest as Req,
  type ServerMemberUpdateOneAndLinkedGuildMemberFault,
  type ServerMemberUpdateOneData,
} from '@some-tools/shared/api/types';
import { guildMemberLinkedSync } from '@some-tools/shared/discord/some-bot/data-access';
import {
  type ExpressRequestHandler,
  makeRecordNotFoundFault,
  mapDbUpdateOneFaults,
} from '@some-tools/shared/utils/backend/common';
import { fail, isFail, ok, Result, tryFailAsync, unwrapMapResult } from '@some-tools/shared/utils/try-fail';

import { makeGetGuildCallback } from '../../bot';
import { emailOrDiscordIdQuery, ServerMember } from '../shared';

const updateBoth = async (
  guildId: string,
  emailOrDiscordId: string,
  update: ServerMemberUpdateOneData
): Promise<Result<DiscordServerMember, ServerMemberUpdateOneAndLinkedGuildMemberFault>> => {
  const updatedServerMemberResult = await tryFailAsync(
    async () =>
      ServerMember.findOneAndUpdate(emailOrDiscordIdQuery(emailOrDiscordId), update, {
        new: true,
        runValidators: true,
      }),
    mapDbUpdateOneFaults<DiscordServerMember>
  );

  if (isFail(updatedServerMemberResult)) {
    return updatedServerMemberResult;
  }

  const updatedServerMember = updatedServerMemberResult.value;

  if (updatedServerMember === null) {
    return fail(makeRecordNotFoundFault());
  }

  const updatedGuildMemberResult = await guildMemberLinkedSync(
    makeGetGuildCallback(guildId),
    updatedServerMember,
    false
  );

  if (isFail(updatedGuildMemberResult)) {
    return updatedGuildMemberResult;
  }

  return ok(updatedServerMember);
};

export const updateOneServerMemberAndLinkedGuildMemberHandler: ExpressRequestHandler<Req> = async (
  req: Req,
  res,
  next
) => {
  try {
    const result = await updateBoth(req.params.guildId, req.params.emailOrDiscordId, req.body);

    unwrapMapResult(result, {
      ifOk: (serverMember) => res.json(serverMember),
      ifFail: (fault) => res.status(fault.httpStatus).json(fault),
    });
  } catch (error) {
    return next(error);
  }
};
