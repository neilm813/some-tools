import type { ServerMemberUnbanOneLibRequest as Req, ServerMemberUnbanOneFault } from '@some-tools/shared/api/types';
import { getCachedGuildResult, makeDiscordUserData, unban } from '@some-tools/shared/discord/some-bot/data-access';
import type { DiscordUserData } from '@some-tools/shared/discord/types';
import { type ExpressRequestHandler, makeRecordNotFoundFault } from '@some-tools/shared/utils/backend/common';
import { fail, isFail, ok, type Result, unwrapMapResult } from '@some-tools/shared/utils/try-fail';

import { discordClient } from '../../bot';
import { serverMemberFindOneByEmail } from '../shared';

const unbanOne = async (
  guildId: string,
  emailOrDiscordId: string
): Promise<Result<DiscordUserData, ServerMemberUnbanOneFault>> => {
  const guildResult = getCachedGuildResult(guildId, discordClient);

  if (isFail(guildResult)) {
    return guildResult;
  }

  const guild = guildResult.value;
  let discordId: null | string = null;

  // If email get linked discord id.
  if (emailOrDiscordId.includes('@')) {
    const serverMemberResult = await serverMemberFindOneByEmail(emailOrDiscordId);

    if (isFail(serverMemberResult)) {
      return serverMemberResult;
    }
    discordId = serverMemberResult.value.discordId;
  } else {
    discordId = emailOrDiscordId;
  }

  if (discordId === null) {
    console.log('no linked discord id');

    return fail(makeRecordNotFoundFault());
  }

  const unbanResult = await unban(guild, discordId);

  if (isFail(unbanResult)) {
    return unbanResult;
  }

  return ok(makeDiscordUserData(unbanResult.value));
};

export const unbanOneServerMemberHandler: ExpressRequestHandler<Req> = async (req: Req, res, next) => {
  try {
    const result = await unbanOne(req.params.guildId, req.params.emailOrDiscordId);
    return unwrapMapResult(result, {
      ifOk: (value) => res.json(value),
      ifFail: (fault) => res.status(fault.httpStatus).json(fault),
    });
  } catch (error) {
    return next(error);
  }
};
