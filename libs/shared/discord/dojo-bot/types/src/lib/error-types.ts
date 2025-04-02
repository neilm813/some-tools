/**
See comments explaining the organization of these types in libs/shared/discord/types/src/lib/error-types.ts
*/

import { type Snowflake } from 'discord.js';

import {
  DiscordApiUserGetOneUtilFault,
  DiscordGuildBanFetchUtilFault,
  DiscordMemberAddToGuildUtilFault,
  DiscordMemberBanUtilFault,
  DiscordMemberFetchUtilLenientFault,
  DiscordMemberKickUtilFault,
  DiscordMemberUpdateOneFault,
  DiscordUserSendDMUtilFault,
} from '@some-tools/shared/discord/types';
import { type CodedHttpFault, type UnidentifiedFault } from '@some-tools/shared/utils/common';

export const DISCORD_DOJO_BOT_FAULT_CODES = {
  DISCORD_API_USER_EMAIL_MISSING: 'DISCORD_API_USER_EMAIL_MISSING',
  DISCORD_BULK_REQUEST_LIMIT: 'DISCORD_BULK_REQUEST_LIMIT',
  INVALID_ROLE_UPDATE_METHOD: 'INVALID_ROLE_UPDATE_METHOD',
  MEMBER_LINKED_ALREADY: 'MEMBER_LINKED_ALREADY',
  MEMBER_LINKED_BANNED: 'MEMBER_LINKED_BANNED',
  MEMBER_JOIN_BANNED: 'MEMBER_JOIN_BANNED',
  MEMBER_JOIN_EMAIL_NOT_FOUND: 'MEMBER_JOIN_EMAIL_NOT_FOUND',
  MEMBER_JOIN_LINKED_ALREADY: 'MEMBER_JOIN_LINKED_ALREADY',
  MEMBER_NOT_LINKED: 'MEMBER_NOT_LINKED',
  MEMBER_NOT_LINKED_BUT_IN_GUILD: 'MEMBER_NOT_LINKED_BUT_IN_GUILD',
  MEMBER_LINKED_NOT_IN_GUILD: 'MEMBER_LINKED_NOT_IN_GUILD',
  MEMBER_LINKED_STILL: 'MEMBER_LINKED_STILL',
} as const;

export type DiscordSomeBotFaultCodes = typeof DISCORD_DOJO_BOT_FAULT_CODES;

export type DiscordMemberLinkedFetchUtilFault =
  | DiscordMemberFetchUtilLenientFault
  | DiscordGuildBanFetchUtilFault
  | DiscordMemberLinkedBannedFault
  | DiscordMemberNotLinkedFault
  | DiscordMemberLinkedNotInGuildFault
  | UnidentifiedFault;

export type DiscordMemberLinkedFetchUtilLenientFault = Exclude<
  DiscordMemberLinkedFetchUtilFault,
  DiscordMemberNotLinkedFault | DiscordMemberLinkedNotInGuildFault
>;

export type DiscordMemberLinkedSendDMUtilFault = DiscordUserSendDMUtilFault | DiscordMemberLinkedFetchUtilFault;

export type DiscordMemberLinkedUpdateOneFault = DiscordMemberUpdateOneFault | DiscordMemberLinkedFetchUtilFault;

export type DiscordMemberLinkedUpdateOneLenientFault = Exclude<
  DiscordMemberLinkedUpdateOneFault,
  DiscordMemberNotLinkedFault | DiscordMemberLinkedNotInGuildFault
>;

export type DiscordMemberLinkedKickUtilFault = DiscordMemberLinkedFetchUtilFault | DiscordMemberKickUtilFault;
export type DiscordMemberLinkedKickUtilLenientFault =
  | DiscordMemberLinkedFetchUtilLenientFault
  | DiscordMemberKickUtilFault;

export type DiscordMemberBanLinkedFault = DiscordMemberBanUtilFault | DiscordMemberLinkedFetchUtilFault;

/**
 * Used for the join page.
 */
export type DiscordMemberJoinFault =
  | DiscordMemberAddToGuildUtilFault
  | DiscordGuildBanFetchUtilFault
  | DiscordApiUserGetOneUtilFault
  | DiscordApiUserEmailMissingFault
  | DiscordMemberJoinEmailNotFoundFault
  | DiscordMemberJoinAlreadyLinkedFault
  | DiscordMemberJoinBannedFault;

export interface DiscordMemberAlreadyLinkedFault extends CodedHttpFault {
  _code: DiscordSomeBotFaultCodes['MEMBER_LINKED_ALREADY'];
}

export interface DiscordApiUserEmailMissingFault extends CodedHttpFault {
  _code: DiscordSomeBotFaultCodes['DISCORD_API_USER_EMAIL_MISSING'];
}

/**
 * Used to prevent requests to our api taking too long due to the discord api rate limits which seems to be
 * 5 per 5 seconds. Discord.js queues requests to avoid hitting the rate limit.
 */
export interface DiscordBulkRequestLimitFault extends CodedHttpFault {
  _code: DiscordSomeBotFaultCodes['DISCORD_BULK_REQUEST_LIMIT'];
  message: `Bulk discord requests are limited to ${number} at a time.`;
}

export interface DiscordInvalidRoleUpdateMethodFault extends CodedHttpFault {
  _code: DiscordSomeBotFaultCodes['INVALID_ROLE_UPDATE_METHOD'];
  message: `The given role change parameter ${string} is invalid. Valid options are: ${string}.`;
}

export interface DiscordMemberLinkedBannedFault extends CodedHttpFault {
  _code: DiscordSomeBotFaultCodes['MEMBER_LINKED_BANNED'];
}

export interface DiscordMemberJoinEmailNotFoundFault extends CodedHttpFault {
  _code: DiscordSomeBotFaultCodes['MEMBER_JOIN_EMAIL_NOT_FOUND'];
}

export interface DiscordMemberJoinAlreadyLinkedFault extends CodedHttpFault {
  _code: DiscordSomeBotFaultCodes['MEMBER_JOIN_LINKED_ALREADY'];
}

export interface DiscordMemberJoinBannedFault extends CodedHttpFault {
  _code: DiscordSomeBotFaultCodes['MEMBER_JOIN_BANNED'];
}

/**
 * Used when it's expected that there would be a linked discord id in the database. Every guild member in the guild
 * should be linked to a database record, otherwise their nickname may not be their real name and they won't be found
 * when used in commands, such as ones that update roles.
 */
export interface DiscordMemberNotLinkedFault extends CodedHttpFault {
  _code: DiscordSomeBotFaultCodes['MEMBER_NOT_LINKED'];
  payload: {
    email: string;
  };
}

/**
 * Used when a discord user is in the guild but their discord id is not found in the database. They need to be be
 * manually linked wth the link discord account command or go to the join page to get linked.
 *
 * These guild members cannot be updated via commands that use emails in our database to find the linked discord user,
 * such as role change commands.
 */
export interface DiscordMemberNotLinkedButInGuildFault extends CodedHttpFault {
  _code: DiscordSomeBotFaultCodes['MEMBER_NOT_LINKED_BUT_IN_GUILD'];
  payload: {
    discordUserId: Snowflake;
  };
}

/**
 * This is not necessarily a problem, this fault is used when a guild member with a discord id wasn't found but they
 * could rejoin via the join page because they aren't banned.
 *    - They haven't joined yet
 *    - They left the guild
 *    - They were kicked
 */
export interface DiscordMemberLinkedNotInGuildFault extends CodedHttpFault {
  _code: DiscordSomeBotFaultCodes['MEMBER_LINKED_NOT_IN_GUILD'];
  payload: {
    email: string;
  };
}

export interface DiscordMemberLinkedStillFault extends CodedHttpFault {
  _code: DiscordSomeBotFaultCodes['MEMBER_LINKED_STILL'];
  payload: {
    email: string;
  };
}

export interface DiscordInvalidRoleUpdateMethodFault extends CodedHttpFault {
  _code: DiscordSomeBotFaultCodes['INVALID_ROLE_UPDATE_METHOD'];
  message: `The given role change parameter ${string} is invalid. Valid options are: ${string}.`;
}
