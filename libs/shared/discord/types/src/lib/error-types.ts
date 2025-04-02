/**
A fault name without 'failed' or 'util' in it either represents one specific fault or a union of faults that could
happen from calling a function which are created with a mapper function which calls the appropriate `makeFault`.

The 'util' naming convention is used when a util function is created to help call another function, often with some
extra logic and therefore extra faults from the util are added to the faults from the function called.

The 'failed' fault naming convention is used as the least specific but still readable error for errors that haven't
been more specifically typed yet.

Example:
the discord `guild.members.fetch` method has an unknown amount of errors that could happen, so a fault mapper function
is created for it and starts with just the `makeDiscordMemberFetchFailedFault` to at least have a clear message for
what operation failed. Additional faults are added to the mapper as they are discovered.

A `guildMemberFetch` util method and related `DiscordMemberFetchUtilFault` union is created for logic and faults added
to the `guild.members.fetch` fault union, such as `DiscordMemberNotInGuildFault` and `DiscordMemberBannedFault`.

// Faults for the mapDiscordMemberFetchFaults
export type DiscordMemberFetchFault = DiscordMemberNotInGuildFault | DiscordMemberFetchFailedFault;

// Faults for the guildMemberFetch util which has added logic and faults.
export type DiscordMemberFetchUtilFault =
  | DiscordGuildNotCachedFault
  | DiscordMemberBanFindUtilFault
  | DiscordMemberBannedFault
  | DiscordMemberFetchFault;
*/

import { type Snowflake } from 'discord.js';

import { type CodedFault, type CodedHttpFault, type UnidentifiedFault } from '@some-tools/shared/utils/common';

export const DISCORD_FAULT_CODES = {
  DISCORD_API_USER_GET_FAILED: 'DISCORD_API_USER_GET_FAILED',
  DISCORD_API_USER_NOT_FOUND: 'DISCORD_API_USER_NOT_FOUND',
  DISCORD_USER_SEND_DM_FAILED: 'DISCORD_USER_SEND_DM_FAILED',
  GUILD_NOT_CACHED: 'GUILD_NOT_CACHED',
  GUILD_BAN_FETCH_FAILED: 'GUILD_BAN_FETCH_FAILED',
  INTERACTION_COLLECTOR_TIMEOUT: 'INTERACTION_COLLECTOR_TIMEOUT',
  INVALID_ROLE_SELECTION: 'INVALID_ROLE_SELECTION',
  MEMBER_ADD_TO_GUILD_FAILED: 'MEMBER_ADD_TO_GUILD_FAILED',
  MEMBER_BAN_FAILED: 'MEMBER_BAN_FAILED',
  MEMBER_BAN_NOT_FOUND: 'MEMBER_BAN_NOT_FOUND',
  MEMBER_BANNED: 'MEMBER_BANNED',
  MEMBER_FETCH_FAILED: 'MEMBERS_FETCH_FAILED',
  MEMBER_KICK_FAILED: 'MEMBER_KICK_FAILED',
  MEMBER_NICKNAME_UPDATE_FAILED: 'MEMBER_NICKNAME_UPDATE_FAILED',
  MEMBER_NOT_BANNABLE: 'MEMBER_NOT_BANNABLE',
  MEMBER_NOT_IN_GUILD: 'MEMBER_NOT_IN_GUILD',
  MEMBER_NOT_MANAGEABLE: 'MEMBER_NOT_MANAGEABLE',
  MEMBER_NOT_KICKABLE: 'MEMBER_NOT_KICKABLE',
  MEMBER_ROLES_UPDATE_FAILED: 'MEMBER_ROLES_UPDATE_FAILED',
  MEMBER_UNBAN_FAILED: 'MEMBER_UNBAN_FAILED',
  MESSAGE_UNSENT_LENGTH_EXCEEDED: 'MESSAGE_UNSENT_LENGTH_EXCEEDED',
  SLASH_COMMAND_SETUP_FAULT: 'SLASH_COMMAND_SETUP_FAULT',
  SLASH_COMMAND_NOT_FOUND: 'SLASH_COMMAND_NOT_FOUND',
} as const;

export type DiscordFaultCodes = typeof DISCORD_FAULT_CODES;

export type DiscordApiUserGetOneFault = DiscordApiUserGetFailedFault; /* | MoreTbd */
export type DiscordApiUserGetOneUtilFault = DiscordApiUserGetOneFault | DiscordApiUserNotFoundFault;

export type DiscordUserSendDMFault = DiscordUserSendFailedFault; /* | MoreTbd */
export type DiscordUserSendDMUtilFault = DiscordUserSendDMFault | DiscordMemberFetchUtilFault;

export type DiscordGuildBanFetchFault = DiscordGuildBanFetchFailedFault; /* | MoreTbd */
export type DiscordGuildBanFetchUtilFault = DiscordGuildNotCachedFault | DiscordGuildBanFetchFault;

export type DiscordMemberFetchFault = DiscordMemberNotInGuildFault | DiscordMemberFetchFailedFault;
export type DiscordMemberFetchUtilFault =
  | DiscordGuildNotCachedFault
  | DiscordGuildBanFetchUtilFault
  | DiscordMemberBannedFault
  | DiscordMemberFetchFault;

export type DiscordMemberFetchUtilLenientFault =
  | DiscordGuildNotCachedFault
  | Exclude<
      DiscordMemberFetchUtilFault,
      DiscordGuildBanFetchUtilFault | DiscordMemberBannedFault | DiscordMemberNotInGuildFault
    >;

export type DiscordMemberSetNicknameFault = DiscordMemberSetNicknameFailedFault; /* | MoreTbd */
export type DiscordMemberSetNicknameUtilFault = DiscordMemberSetNicknameFailedFault | DiscordMemberNotManageableFault;

export type DiscordMemberRolesUpdateFault = DiscordMemberRoleUpdateFailedFault; /* | MoreTbd  */
export type DiscordMemberRolesUpdateUtilFault = DiscordMemberRolesUpdateFault | DiscordMemberNotManageableFault;

export type DiscordMemberUpdateOneFault =
  | DiscordMemberSetNicknameUtilFault
  | DiscordMemberRolesUpdateUtilFault
  | UnidentifiedFault;

/**
 * When an actual update operation has failed. An update operation is only attempted on members in the guild.
 */
export type DiscordMemberUpdateOperationFault =
  | DiscordMemberSetNicknameUtilFault
  | DiscordMemberRolesUpdateUtilFault
  | UnidentifiedFault;

export type DiscordMemberKickFault = DiscordMemberKickFailedFault; /* | MoreTbd */
export type DiscordMemberKickUtilFault = DiscordMemberKickFault | DiscordMemberNotKickableFault;

export type DiscordMemberBanFault = DiscordMemberBanFailedFault; /*  | MoreTbd */
export type DiscordMemberBanUtilFault = DiscordMemberNotBannableFault | DiscordMemberBanFault;

export type DiscordMemberUnbanUtilFault =
  | DiscordMemberUnbanFailedFault
  | DiscordMemberBanNotFoundFault
  | DiscordGuildNotCachedFault;

export type DiscordMemberAddToGuildUtilFault = DiscordGuildNotCachedFault | DiscordMemberAddToGuildFailedFault;

export interface DiscordApiUserNotFoundFault extends CodedHttpFault {
  _code: DiscordFaultCodes['DISCORD_API_USER_NOT_FOUND'];
  payload: {
    discordUserId: Snowflake;
  };
}

export interface DiscordApiUserGetFailedFault extends CodedHttpFault {
  _code: DiscordFaultCodes['DISCORD_API_USER_GET_FAILED'];
}

/**
 * Direct message fault.
 */
export interface DiscordUserSendFailedFault extends CodedHttpFault {
  _code: DiscordFaultCodes['DISCORD_USER_SEND_DM_FAILED'];
}

export interface DiscordMemberFetchFailedFault extends CodedHttpFault {
  _code: DiscordFaultCodes['MEMBER_FETCH_FAILED'];
}

/**
 * This shouldn't happen, code that depends on a cached guild will return this error when the guild isn't found.
 */
export interface DiscordGuildNotCachedFault extends CodedHttpFault {
  _code: DiscordFaultCodes['GUILD_NOT_CACHED'];
  payload: {
    guildId: Snowflake;
  };
}

export interface DiscordGuildBanFetchFailedFault extends CodedHttpFault {
  _code: DiscordFaultCodes['GUILD_BAN_FETCH_FAILED'];
}

/**
 * Presenting a component (buttons / modals) during a slash command requires specifying a timeout. If the user doesn't
 * act before the timeout, this error will occur and be handled above the command in the code that runs the command.
 */
export interface DiscordInteractionCollectorTimeoutFault extends CodedFault {
  _code: DiscordFaultCodes['INTERACTION_COLLECTOR_TIMEOUT'];
}

/**
 * Used mostly in our api for validating passed-in roles. Slash commands should already validate selected roles before
 * calling our api, but our api could be called from another origin (front-end app).
 */
export interface DiscordInvalidRoleSelectionFault extends CodedHttpFault {
  _code: DiscordFaultCodes['INVALID_ROLE_SELECTION'];
  message: `Invalid role(s) selected: ${string} ${string}.`;
}

export interface DiscordMemberAddToGuildFailedFault extends CodedHttpFault {
  _code: DiscordFaultCodes['MEMBER_ADD_TO_GUILD_FAILED'];
  payload: {
    discordUserId: Snowflake;
    guildId: Snowflake;
  };
}

export interface DiscordMemberBanFailedFault extends CodedHttpFault {
  _code: DiscordFaultCodes['MEMBER_BAN_FAILED'];
  payload: {
    discordUserId: Snowflake;
  };
}

export interface DiscordMemberBannedFault extends CodedHttpFault {
  _code: DiscordFaultCodes['MEMBER_BANNED'];
}

export interface DiscordMemberKickFailedFault extends CodedHttpFault {
  _code: DiscordFaultCodes['MEMBER_KICK_FAILED'];
  payload: {
    discordUserId: Snowflake;
  };
}

export interface DiscordMemberSetNicknameFailedFault extends CodedHttpFault {
  _code: DiscordFaultCodes['MEMBER_NICKNAME_UPDATE_FAILED'];
  payload: {
    discordUserId: Snowflake;
  };
}

export interface DiscordMemberNotBannableFault extends CodedHttpFault {
  _code: DiscordFaultCodes['MEMBER_NOT_BANNABLE'];
  payload: {
    discordUserId: Snowflake;
  };
}

export interface DiscordMemberNotInGuildFault extends CodedHttpFault {
  _code: DiscordFaultCodes['MEMBER_NOT_IN_GUILD'];
  payload: {
    discordUserId?: string;
  };
}

/**
 * When the bot doesn't have permission to manage a guild member. This only happens if the bot wasn't granted admin
 * and/or the bot's role in the server is below a role the guild member has.
 *
 * * The server owner is always be unmanageable.
 */
export interface DiscordMemberNotManageableFault extends CodedHttpFault {
  _code: DiscordFaultCodes['MEMBER_NOT_MANAGEABLE'];
  payload: {
    discordUserId: Snowflake;
  };
}

/**
 * When the bot doesn't have permission to kick a guild member. This only happens if the bot wasn't granted admin
 * and/or the bot's role in the server is below a role the guild member has.
 *
 * * The server owner is always unmanageable.
 */
export interface DiscordMemberNotKickableFault extends CodedHttpFault {
  _code: DiscordFaultCodes['MEMBER_NOT_KICKABLE'];
  payload: {
    discordUserId: Snowflake;
  };
}

export interface DiscordMemberUnbanFailedFault extends CodedHttpFault {
  _code: DiscordFaultCodes['MEMBER_UNBAN_FAILED'];
  message: `Failed to unban the requested account. ${string}`;
}

export interface DiscordMessageUnsentLengthExceeded extends CodedHttpFault {
  _code: DiscordFaultCodes['MESSAGE_UNSENT_LENGTH_EXCEEDED'];
  message: `The message was not sent due to exceeding the length limit of ${number} by ${number}.`;
}

export interface DiscordMemberBanNotFoundFault extends CodedHttpFault {
  _code: DiscordFaultCodes['MEMBER_BAN_NOT_FOUND'];
  message: `The discord user with id ${string} wasn't found in the ban list.`;
  payload: {
    discordUserId: Snowflake;
  };
}

export interface DiscordMemberRoleUpdateFailedFault extends CodedHttpFault {
  _code: DiscordFaultCodes['MEMBER_ROLES_UPDATE_FAILED'];
  payload: {
    discordUserId: Snowflake;
  };
}

/**
 * Used mostly in our api for validating passed-in roles. Slash commands should already validate selected roles before
 * calling our api, but our api could be called from another origin (front-end app).
 */
export interface DiscordInvalidRoleSelectionFault extends CodedHttpFault {
  _code: DiscordFaultCodes['INVALID_ROLE_SELECTION'];
  message: `Invalid role(s) selected: ${string} ${string}.`;
}

/**
 * Used during the `InteractionCreate` discord event when using the event data to find the exported slash command
 * object in an in-memory collection to execute its logic.
 *
 * This error should only occur if slash command names are changed locally but not deployed to discord via the api
 * project's related `environment.ts` var.
 */
export interface DiscordSlashCommandNotFoundFault extends CodedFault {
  _code: DiscordFaultCodes['SLASH_COMMAND_NOT_FOUND'];
}

/**
 * This is used for when the developer setup a slash command incorrectly, such as the command was ran from a direct
 * message but the slash command only has a run method to handle in-guild commands. See `tryExecuteChatInputCommand` in
 * `use-commands.ts`.
 */
export interface DiscordSlashCommandSetupFault extends CodedFault {
  _code: DiscordFaultCodes['SLASH_COMMAND_SETUP_FAULT'];
}
