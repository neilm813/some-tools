// Used by the join page.

import axios from 'axios';

import type {
  DiscordServerMember,
  MongooseServerMember,
  ServerMemberJoinGuildLibRequest as Req,
  ServerMemberJoinData,
  ServerMemberJoinGuildFault,
} from '@some-tools/shared/api/types';
import {
  DiscordApiUserGetOneUtilFault,
  DiscordMemberJoinAlreadyLinkedFault,
  DiscordMemberJoinEmailNotFoundFault,
  getCachedGuildResult,
  guildBanFetch,
  guildMemberAdd,
  makeDiscordApiUserEmailMissingFault,
  makeDiscordMemberJoinAlreadyLinkedFault,
  makeDiscordMemberJoinBannedFault,
  makeDiscordMemberJoinEmailNotFoundFault,
  makeLinkedAccountStates,
  mapDiscordApiUserGetFaults,
} from '@some-tools/shared/discord/some-bot/data-access';
import {
  type DbFindOneFault,
  type DbUpdateOneFault,
  type ExpressRequestHandler,
  mapDbFindOneFaults,
  mapDbUpdateOneFaults,
} from '@some-tools/shared/utils/backend/common';
import { DOJO_EMAILS, isNonNullObject } from '@some-tools/shared/utils/common';
import { fail, isFail, ok, type Result, tryFailAsync, unwrapMapResult } from '@some-tools/shared/utils/try-fail';

import { discordClient } from '../../bot';
import { discordServerMemberRouter, ServerMember } from '../shared';

/**
 * @see [Discord api user](https://discord.com/developers/docs/resources/user#user-object)
 */
type DiscordApiUser = {
  id: string;
  email?: string;
};

// Only checking for the minimum keys needed for now. Would be better to use a lib like type-box for larger checks.
const isDiscordApiUser = (data: unknown): data is DiscordApiUser =>
  isNonNullObject(data) && 'id' in data && typeof data['id'] === 'string';

/**
 * Get's the discord user from the discord api directly so we can check the email address used for discord which
 * discord.js doesn't provide.
 * * Discord.js should be used when possible since it automatically queues requests to avoid the discord api rate limit.
 * * If more discord api routes are needed, move this into a new data-access lib and merge discord utils lib into it.
 * @see [Discord api /users/@me](https://discord.com/developers/docs/resources/user#get-current-user)
 * @see [Discord Grant Flow](https://discordjs.guide/oauth2/#getting-an-oauth2-url)
 */
const getDiscordUser = async (
  joinData: ServerMemberJoinData
): Promise<Result<DiscordApiUser, DiscordApiUserGetOneUtilFault>> => {
  return tryFailAsync(
    async () => {
      const response = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `${joinData.discordTokenType} ${joinData.discordAccessToken}`,
        },
      });

      const data = response.data;

      if (isDiscordApiUser(data)) {
        return data;
      }

      throw new Error('Received unknown data type from discord api.');
    },
    (error) => mapDiscordApiUserGetFaults(error)
  );
};

/**
 * Finds by email, if found and not already linked then links the discord account. When the discord user is joined to
 * the guild later, the guildMemberAdd event in the bot will fire which is when they will get their roles added.
 */
const linkDiscordAccountToServerMember = async (
  emailToLink: string,
  discordIdToLink: string
): Promise<
  Result<
    MongooseServerMember,
    | DbFindOneFault
    | DbUpdateOneFault<DiscordServerMember>
    | DiscordMemberJoinEmailNotFoundFault
    | DiscordMemberJoinAlreadyLinkedFault
  >
> => {
  const serverMemberResult = await tryFailAsync(
    async () =>
      ServerMember.findOne({
        $or: [{ email: emailToLink }, { discordId: discordIdToLink }],
      }),
    mapDbFindOneFaults
  );

  if (isFail(serverMemberResult)) {
    return serverMemberResult;
  }

  const serverMember = serverMemberResult.value;

  if (!serverMember) {
    return fail(makeDiscordMemberJoinEmailNotFoundFault(DOJO_EMAILS.onboarding));
  }

  const { isLinkedExact, isLinkedToDifferentEmail, isLinkedToDifferentDiscordId } = makeLinkedAccountStates(
    serverMember,
    emailToLink,
    discordIdToLink
  );

  // Even if the email isn't a match since their discord id is already linked, this discord account is already approved
  // to join. They could've entered a different email by mistake or their discord account's email is a different email
  // than what they enrolled with.
  if (isLinkedExact || isLinkedToDifferentEmail) {
    return ok(serverMember);
  }

  if (isLinkedToDifferentDiscordId) {
    return fail(
      makeDiscordMemberJoinAlreadyLinkedFault(serverMember, emailToLink, discordIdToLink, DOJO_EMAILS.onboarding)
    );
  }

  const updatedServerMemberResult = await tryFailAsync(
    async () =>
      ServerMember.findByIdAndUpdate(
        serverMember._id,
        {
          discordId: discordIdToLink,
        },
        { runValidators: true }
      ),
    mapDbUpdateOneFaults
  );

  if (isFail(updatedServerMemberResult)) {
    return updatedServerMemberResult;
  }

  const updatedSeverMember = updatedServerMemberResult.value;

  // This shouldn't happen since they were previously found.
  if (!updatedSeverMember) {
    return fail(makeDiscordMemberJoinEmailNotFoundFault(DOJO_EMAILS.onboarding));
  }

  return ok(updatedSeverMember);
};

/**
 *
 * @returns If the user was successful joined to the guild the ok result contains a url that the front-end will
 *    replace in the address bar to open the discord server in the discord web client. If they use the desktop app,
 *    they will see the joined server there as well.
 */
const joinGuild = async (
  guildId: string,
  joinData: ServerMemberJoinData
): Promise<Result<string, ServerMemberJoinGuildFault>> => {
  const redirectToGuildUrlAfterJoined = `https://discord.com/channels/${guildId}`;

  const guildResult = getCachedGuildResult(guildId, discordClient);

  if (isFail(guildResult)) {
    return guildResult;
  }

  const guild = guildResult.value;
  const discordUserResult = await getDiscordUser(joinData);

  if (isFail(discordUserResult)) {
    return discordUserResult;
  }

  const discordUser = discordUserResult.value;
  const banFindResult = await guildBanFetch(guild, discordUser.id);

  if (isFail(banFindResult)) {
    return banFindResult;
  }

  const banInfo = banFindResult.value;

  if (banInfo.isBanned) {
    return fail(makeDiscordMemberJoinBannedFault(banInfo.guildBan, DOJO_EMAILS.onboarding));
  }

  if (joinData.enrollmentEmail) {
    const linkAccountResult = await linkDiscordAccountToServerMember(joinData.enrollmentEmail, discordUser.id);

    if (isFail(linkAccountResult)) {
      return linkAccountResult;
    }
  } else {
    if (!discordUser.email) {
      return fail(makeDiscordApiUserEmailMissingFault(DOJO_EMAILS.onboarding));
    }

    const linkAccountResult = await linkDiscordAccountToServerMember(discordUser.email, discordUser.id);

    if (isFail(linkAccountResult)) {
      return linkAccountResult;
    }
  }

  const addToGuildResult = await guildMemberAdd(discordUser.id, joinData.discordAccessToken, guild);

  if (isFail(addToGuildResult)) {
    return addToGuildResult;
  }

  return ok(redirectToGuildUrlAfterJoined);
};

export const joinGuildServerMemberHandler: ExpressRequestHandler<Req> = async (req: Req, res, next) => {
  try {
    const result = await joinGuild(req.params.guildId, req.body);
    return unwrapMapResult(result, {
      ifOk: (value) => res.json(value),
      ifFail: (fault) => res.status(fault.httpStatus).json(fault),
    });
  } catch (error) {
    return next(error);
  }
};
