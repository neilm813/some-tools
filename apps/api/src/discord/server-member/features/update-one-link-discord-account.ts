import {
  type DiscordServerMember,
  type ServerMemberLinkDiscordAccountLibRequest as Req,
  ServerMemberLinkDiscordAccountFault,
} from '@some-tools/shared/api/types';
import {
  guildMemberLinkedSync,
  makeDiscordMemberAlreadyLinkedFault,
} from '@some-tools/shared/discord/some-bot/data-access';
import {
  type ExpressRequestHandler,
  makeRecordNotFoundFault,
  mapDbUpdateOneFaults,
} from '@some-tools/shared/utils/backend/common';
import { fail, isFail, ok, Result, tryFailAsync, unwrapMapResult } from '@some-tools/shared/utils/try-fail';

import { makeGetGuildCallback } from '../../bot';
import { ServerMember, serverMemberFindOneEitherEmailOrDiscordId } from '../shared';

const updateServerMemberAndGuildMember = async (
  guildId: string,
  email: string,
  discordIdToLink: string
): Promise<Result<DiscordServerMember, ServerMemberLinkDiscordAccountFault>> => {
  const foundServerMemberResult = await serverMemberFindOneEitherEmailOrDiscordId(email, discordIdToLink);

  if (isFail(foundServerMemberResult)) {
    return foundServerMemberResult;
  }

  const serverMember = foundServerMemberResult.value;

  if (serverMember.discordId) {
    return fail(makeDiscordMemberAlreadyLinkedFault(serverMember, email, discordIdToLink));
  }

  const updatedServerMemberResult = await tryFailAsync(
    async () =>
      ServerMember.findOneAndUpdate(
        { _id: serverMember._id },
        { discordId: discordIdToLink },
        { new: true, runValidators: true }
      ),
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

export const updateOneServerMemberLinkDiscordAccountHandler: ExpressRequestHandler<Req> = async (
  req: Req,
  res,
  next
) => {
  try {
    const result = await updateServerMemberAndGuildMember(req.params.guildId, req.params.email, req.params.discordId);

    unwrapMapResult(result, {
      ifOk: (serverMember) => res.json(serverMember),
      ifFail: (fault) => res.status(fault.httpStatus).json(fault),
    });
  } catch (error) {
    return next(error);
  }
};
