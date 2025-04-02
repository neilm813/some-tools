import type {
  DiscordServerMember,
  ServerMemberUnlinkDiscordAccountLibRequest as Req,
  ServerMemberUnlinkDiscordAccountFault,
} from '@some-tools/shared/api/types';
import { guildMemberLinkedKick } from '@some-tools/shared/discord/some-bot/data-access';
import {
  type ExpressRequestHandler,
  makeRecordNotFoundFault,
  mapDbUpdateOneFaults,
} from '@some-tools/shared/utils/backend/common';
import { fail, isFail, ok, Result, tryFailAsync, unwrapMapResult } from '@some-tools/shared/utils/try-fail';

import { makeGetGuildCallback } from '../../bot';
import { ServerMember, serverMemberFindOneByEmail } from '../shared';

const unlinkAndKick = async (
  guildId: string,
  email: string,
  shouldKick: boolean
): Promise<Result<DiscordServerMember, ServerMemberUnlinkDiscordAccountFault>> => {
  const foundServerMemberResult = await serverMemberFindOneByEmail(email);

  if (isFail(foundServerMemberResult)) {
    return foundServerMemberResult;
  }

  const serverMember = foundServerMemberResult.value;

  if (shouldKick) {
    const kickResult = await guildMemberLinkedKick(makeGetGuildCallback(guildId), serverMember, false);

    if (isFail(kickResult)) {
      return kickResult;
    }
  }

  const updatedServerMemberResult = await tryFailAsync(
    async () =>
      ServerMember.findOneAndUpdate({ _id: serverMember._id }, { discordId: null }, { new: true, runValidators: true }),
    mapDbUpdateOneFaults<DiscordServerMember>
  );

  if (isFail(updatedServerMemberResult)) {
    return updatedServerMemberResult;
  }

  const updatedServerMember = updatedServerMemberResult.value;

  if (updatedServerMember === null) {
    return fail(makeRecordNotFoundFault());
  }

  return ok(updatedServerMember);
};

export const updateOneServerMemberUnlinkDiscordAccountHandler: ExpressRequestHandler<Req> = async (
  req: Req,
  res,
  next
) => {
  try {
    const result = await unlinkAndKick(req.params.guildId, req.params.email, req.body.shouldKick);

    unwrapMapResult(result, {
      ifOk: (serverMember) => res.json(serverMember),
      ifFail: (fault) => res.status(fault.httpStatus).json(fault),
    });
  } catch (error) {
    return next(error);
  }
};
