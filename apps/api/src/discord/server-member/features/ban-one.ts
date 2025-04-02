import type { ServerMemberBanOneLibRequest as Req, ServerMemberBanOneFault } from '@some-tools/shared/api/types';
import {
  getCachedGuildResult,
  guildMemberBan,
  makeDiscordGuildMemberData,
} from '@some-tools/shared/discord/some-bot/data-access';
import type { DiscordGuildMemberData } from '@some-tools/shared/discord/types';
import { type ExpressRequestHandler, makeRecordNotFoundFault } from '@some-tools/shared/utils/backend/common';
import { fail, isFail, ok, type Result, unwrapMapResult } from '@some-tools/shared/utils/try-fail';

import { discordClient } from '../../bot';
import { serverMemberFindOneByEmail } from '../shared';

const banOne = async (
  guildId: string,
  emailOrDiscordId: string
): Promise<Result<DiscordGuildMemberData, ServerMemberBanOneFault>> => {
  const guildResult = getCachedGuildResult(guildId, discordClient);

  if (isFail(guildResult)) {
    return guildResult;
  }

  const guild = guildResult.value;
  let discordId: null | string = null;

  // If email get linked discord id to use to find guild member.
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
    return fail(makeRecordNotFoundFault());
  }

  const foundGuildMembers = await guild.members.fetch({ user: [discordId] });
  const guildMember = foundGuildMembers.first();

  if (!guildMember) {
    return fail(makeRecordNotFoundFault());
  }

  const banResult = await guildMemberBan(guildMember);

  if (isFail(banResult)) {
    return banResult;
  }

  return ok(makeDiscordGuildMemberData(banResult.value));
};

export const banOneServerMemberHandler: ExpressRequestHandler<Req> = async (req: Req, res, next) => {
  try {
    const result = await banOne(req.params.guildId, req.params.emailOrDiscordId);
    return unwrapMapResult(result, {
      ifOk: (value) => res.json(value),
      ifFail: (fault) => res.status(fault.httpStatus).json(fault),
    });
  } catch (error) {
    return next(error);
  }
};
