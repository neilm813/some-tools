import { type GuildBan, type Snowflake, userMention } from 'discord.js';

import {
  type DiscordServerMember,
  SERVER_MEMBER_ROLE_UPDATE_METHODS,
  ServerMemberRoleUpdateMethod,
} from '@some-tools/shared/api/types';
import { DISCORD_JOIN_URL } from '@some-tools/shared/discord/some-bot/environments';
import {
  DISCORD_DOJO_BOT_FAULT_CODES,
  type DiscordApiUserEmailMissingFault,
  type DiscordBulkRequestLimitFault,
  type DiscordInvalidRoleUpdateMethodFault,
  type DiscordMemberAlreadyLinkedFault,
  type DiscordMemberJoinAlreadyLinkedFault,
  type DiscordMemberJoinBannedFault,
  type DiscordMemberJoinEmailNotFoundFault,
  type DiscordMemberLinkedBannedFault,
  type DiscordMemberLinkedNotInGuildFault,
  type DiscordMemberLinkedStillFault,
  type DiscordMemberNotLinkedButInGuildFault,
  type DiscordMemberNotLinkedFault,
} from '@some-tools/shared/discord/some-bot/types';
import { SHARED_TYPE_NAMES } from '@some-tools/shared/types';

import { DISCORD_BULK_REQUEST_LIMIT } from './constants';

export const makeDiscordInvalidRoleUpdateMethodFault = (
  given: string,
  validOptions: ServerMemberRoleUpdateMethod[] = Object.keys(
    SERVER_MEMBER_ROLE_UPDATE_METHODS
  ) as ServerMemberRoleUpdateMethod[]
): DiscordInvalidRoleUpdateMethodFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_DOJO_BOT_FAULT_CODES.INVALID_ROLE_UPDATE_METHOD,
  httpStatus: 404,
  message: `The given role change parameter ${given} is invalid. Valid options are: ${validOptions.join(', ')}.`,
});

export const makeLinkedAccountStates = (
  discordServerMember: DiscordServerMember,
  emailToLink: string,
  discordIdToLink: string
) => {
  const givenEmail = emailToLink.trim().toLowerCase();
  const givenDiscordId = discordIdToLink.trim().toLowerCase();
  const { email: foundEmail, discordId: foundDiscordId } = discordServerMember;
  const isLinked = Boolean(foundDiscordId);

  return {
    isLinked,
    isNotLinked: !foundDiscordId,
    /**
     * The email to link and discord id to link are already linked to each other. Ideal case when already linked.
     */
    isLinkedExact: givenEmail === foundEmail && givenDiscordId === foundDiscordId,
    /**
     * Email found but linked to a different discord id.
     */
    isLinkedToDifferentDiscordId: isLinked && givenDiscordId !== foundDiscordId && givenEmail === foundEmail,
    /**
     * Discord id found but linked to a different email.
     */
    isLinkedToDifferentEmail: isLinked && givenEmail !== foundEmail && givenDiscordId === foundDiscordId,
  };
};

export const makeDiscordMemberAlreadyLinkedFault = (
  discordServerMember: DiscordServerMember,
  emailToLink: string,
  discordIdToLink: string
): DiscordMemberAlreadyLinkedFault => {
  const { isLinkedExact, isLinkedToDifferentDiscordId, isLinkedToDifferentEmail } = makeLinkedAccountStates(
    discordServerMember,
    emailToLink,
    discordIdToLink
  );
  let message = 'A discord account is already linked.';

  if (isLinkedExact) {
    message = 'The email and discord user id are already linked.';
  } else if (isLinkedToDifferentDiscordId) {
    message = 'That email is already linked to a different discord account.';
  } else if (isLinkedToDifferentEmail) {
    message = 'That discord user id is already linked to a different email.';
  }

  return {
    _type: SHARED_TYPE_NAMES.CODED_FAULT,
    _code: DISCORD_DOJO_BOT_FAULT_CODES.MEMBER_LINKED_ALREADY,
    httpStatus: 400,
    message,
  };
};

/**
 * See comments on {@link DiscordBulkRequestLimitFault}.
 */
export const makeDiscordBulkRequestLimitFault = (): DiscordBulkRequestLimitFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_DOJO_BOT_FAULT_CODES.DISCORD_BULK_REQUEST_LIMIT,
  httpStatus: 400,
  message: `Bulk discord requests are limited to ${DISCORD_BULK_REQUEST_LIMIT} at a time.`,
});

export const makeDiscordMemberLinkedBannedFault = (
  guildBan: GuildBan,
  serverMember: DiscordServerMember
): DiscordMemberLinkedBannedFault => {
  return {
    _type: SHARED_TYPE_NAMES.CODED_FAULT,
    _code: DISCORD_DOJO_BOT_FAULT_CODES.MEMBER_LINKED_BANNED,
    message: `The discord user with username: ${guildBan.user.username} and email in our database: ${
      serverMember.email
    } is banned. Reason: ${guildBan.reason || 'N/A'}.\nIf unbanned they can rejoin from ${DISCORD_JOIN_URL}`,
    httpStatus: 500,
    payload: {
      serverMember,
    },
  };
};

export const makeDiscordMemberJoinBannedFault = (
  guildBan: GuildBan,
  onboardingEmail: string
): DiscordMemberJoinBannedFault => ({
  _code: DISCORD_DOJO_BOT_FAULT_CODES.MEMBER_JOIN_BANNED,
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  httpStatus: 400,
  message: `Discord username ${guildBan.user.username} is banned. Contact ${onboardingEmail} if you believe this is a mistake.`,
});

/**
 * Usually this means onboarding hasn't added it to the database yet or the user entered the wrong email address.
 */
export const makeDiscordMemberJoinEmailNotFoundFault = (
  onboardingEmail: string
): DiscordMemberJoinEmailNotFoundFault => ({
  _code: DISCORD_DOJO_BOT_FAULT_CODES.MEMBER_JOIN_EMAIL_NOT_FOUND,
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  httpStatus: 400,
  message: `The provided email address was not found. Make sure to use the email you enrolled with. Contact ${onboardingEmail} for help.`,
});

/**
 * This should only be used when {@link makeLinkedAccountStates} `isLinkedToDifferentDiscordId` is `true` because the
 * other cases result either in a successful linking, or rejoining when the discord id is already linked.
 *
 * This fault will use a generic error message if it isn't used according to the above.
 */
export const makeDiscordMemberJoinAlreadyLinkedFault = (
  discordServerMember: DiscordServerMember,
  emailToLink: string,
  discordIdToLink: string,
  onboardingEmail: string
): DiscordMemberJoinAlreadyLinkedFault => {
  const { isLinkedToDifferentDiscordId } = makeLinkedAccountStates(discordServerMember, emailToLink, discordIdToLink);

  return {
    _code: DISCORD_DOJO_BOT_FAULT_CODES.MEMBER_JOIN_LINKED_ALREADY,
    _type: SHARED_TYPE_NAMES.CODED_FAULT,
    httpStatus: 400,
    message: `${
      isLinkedToDifferentDiscordId
        ? 'A different discord account is already linked to that email. If the other discord account is yours, log into it and then revisit this join page if you need to rejoin.'
        : 'Linking accounts was unsuccessful.'
    } Contact your instructor or ${onboardingEmail} for help.`,
  };
};

// TODO: import the onboarding email from environments?
export const makeDiscordApiUserEmailMissingFault = (onboardingEmail: string): DiscordApiUserEmailMissingFault => ({
  _code: DISCORD_DOJO_BOT_FAULT_CODES.DISCORD_API_USER_EMAIL_MISSING,
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  httpStatus: 400,
  message: `Your discord account is missing an associated email. This usually means your registration with discord is incomplete, such as email verification. Look for a banner at the top of discord to finish registration then try using the join link again. Still having problems? Before using the join link again, log out of discord and back in, reset password if needed, create a new discord account, or contact ${onboardingEmail} for more help.`,
});

export const makeDiscordMemberLinkedNotInGuildFault = (
  serverMember: DiscordServerMember
): DiscordMemberLinkedNotInGuildFault => {
  return {
    _code: DISCORD_DOJO_BOT_FAULT_CODES.MEMBER_LINKED_NOT_IN_GUILD,
    _type: SHARED_TYPE_NAMES.CODED_FAULT,
    message: `The user with email ${serverMember.email}${
      serverMember.discordId ? ` and discord id ${serverMember.discordId}` : ''
    } is in the database but wasn't found in the discord server. They can join from: ${DISCORD_JOIN_URL}`,
    httpStatus: 500,
    payload: {
      email: serverMember.email,
    },
  };
};

export const makeDiscordMemberLinkedStillFault = (serverMember: DiscordServerMember): DiscordMemberLinkedStillFault => {
  return {
    _code: DISCORD_DOJO_BOT_FAULT_CODES.MEMBER_LINKED_STILL,
    _type: SHARED_TYPE_NAMES.CODED_FAULT,
    message: `The user with email ${serverMember.email} is still linked to a discord account. Unlink the discord account first if needed.`,
    httpStatus: 400,
    payload: {
      email: serverMember.email,
    },
  };
};

export const makeDiscordMemberNotLinkedFault = (serverMember: DiscordServerMember): DiscordMemberNotLinkedFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_DOJO_BOT_FAULT_CODES.MEMBER_NOT_LINKED,
  httpStatus: 404,
  message: `The database record with email ${serverMember.email} isn't linked to any discord account id. They can join from: ${DISCORD_JOIN_URL}`,
  payload: {
    email: serverMember.email,
  },
});

export const makeDiscordMemberNotLinkedButInGuildFault = (
  discordUserId: Snowflake
): DiscordMemberNotLinkedButInGuildFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_DOJO_BOT_FAULT_CODES.MEMBER_NOT_LINKED_BUT_IN_GUILD,
  httpStatus: 404,
  message: `The discord user ${userMention(
    discordUserId
  )} with discord user id ${discordUserId} is in the server but not linked to the database. They must be linked with the link-discord-account command or by going to ${DISCORD_JOIN_URL}.`,
  payload: {
    discordUserId,
  },
});
