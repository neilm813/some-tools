import type {
  DiscordServerMember,
  ServerMemberUpdateLinkedGuildMemberLibRequest as Req,
  ServerMemberUpdateLinkedGuildMemberFault,
} from '@some-tools/shared/api/types';
import { guildMemberLinkedSync } from '@some-tools/shared/discord/some-bot/data-access';
import { type ExpressRequestHandler, makeRecordNotFoundFault } from '@some-tools/shared/utils/backend/common';
import { makeUnidentifiedFault } from '@some-tools/shared/utils/common';
import { fail, isFail, ok, Result, tryFailAsync, unwrapMapResult } from '@some-tools/shared/utils/try-fail';

import { makeGetGuildCallback } from '../../bot';
import { emailOrDiscordIdQuery, ServerMember } from '../shared';

/**
 * ! Do not call this endpoint from the `guild-member-update.ts` event as this endpoint triggers that event.
 */
const tryUpdateLinkedGuildMember = async (
  emailOrDiscordId: string,
  guildId: string
): Promise<Result<DiscordServerMember, ServerMemberUpdateLinkedGuildMemberFault>> => {
  const serverMemberResult = await tryFailAsync(
    async () => ServerMember.findOne(emailOrDiscordIdQuery(emailOrDiscordId)),
    makeUnidentifiedFault
  );

  if (isFail(serverMemberResult)) {
    return serverMemberResult;
  }

  const serverMember = serverMemberResult.value;

  if (serverMember === null) {
    return fail(makeRecordNotFoundFault());
  }

  const updatedGuildMember = await guildMemberLinkedSync(makeGetGuildCallback(guildId), serverMember, true);

  if (isFail(updatedGuildMember)) {
    return updatedGuildMember;
  }

  return ok(serverMember);
};

export const updateLinkedGuildMemberHandler: ExpressRequestHandler<Req> = async (req: Req, res, next) => {
  try {
    const result = await tryUpdateLinkedGuildMember(req.params.emailOrDiscordId, req.params.guildId);

    return unwrapMapResult(result, {
      ifOk: (serverMember) => res.json(serverMember),
      ifFail: (fault) => res.status(fault.httpStatus).json(fault),
    });
  } catch (error) {
    return next(error);
  }
};
