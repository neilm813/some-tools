import {
  type Client,
  DiscordAPIError,
  DiscordjsError,
  type Guild,
  type GuildBan,
  type GuildMember,
  type GuildMemberManager, // eslint-disable-line @typescript-eslint/no-unused-vars
  type GuildMemberRoleManager, // eslint-disable-line @typescript-eslint/no-unused-vars
  type Snowflake,
} from 'discord.js';

import {
  DISCORD_FAULT_CODES,
  type DiscordApiUserGetFailedFault,
  type DiscordApiUserGetOneFault,
  type DiscordApiUserNotFoundFault,
  type DiscordGuildBanFetchFailedFault,
  type DiscordGuildBanFetchFault,
  type DiscordGuildNotCachedFault,
  type DiscordInteractionCollectorTimeoutFault,
  type DiscordInvalidRoleSelectionFault,
  type DiscordMemberAddToGuildFailedFault,
  type DiscordMemberBanFailedFault,
  type DiscordMemberBanFault,
  type DiscordMemberBannedFault,
  type DiscordMemberBanNotFoundFault,
  type DiscordMemberFetchFailedFault,
  type DiscordMemberFetchFault,
  type DiscordMemberKickFailedFault,
  type DiscordMemberKickFault,
  type DiscordMemberNotBannableFault,
  type DiscordMemberNotInGuildFault,
  type DiscordMemberNotKickableFault,
  type DiscordMemberNotManageableFault,
  type DiscordMemberRolesUpdateFault,
  type DiscordMemberRoleUpdateFailedFault,
  type DiscordMemberSetNicknameFailedFault,
  type DiscordMemberSetNicknameFault,
  type DiscordMemberUnbanFailedFault,
  type DiscordMessageUnsentLengthExceeded,
  type DiscordSlashCommandNotFoundFault,
  type DiscordSlashCommandSetupFault,
  type DiscordUserSendDMFault,
  type DiscordUserSendFailedFault,
} from '@some-tools/shared/discord/types';
import { SHARED_TYPE_NAMES } from '@some-tools/shared/types';
import {
  httpStatusFromErrorOrResponse,
  makeUnidentifiedFault,
  messageFromError,
  UnidentifiedFault,
} from '@some-tools/shared/utils/common';
import { fail, ok, type Result } from '@some-tools/shared/utils/try-fail';

import { MAX_MESSAGE_LENGTH } from './constants';

export const makeDiscordUserSendFailedFault = (error: unknown): DiscordUserSendFailedFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_FAULT_CODES.DISCORD_USER_SEND_DM_FAILED,
  httpStatus: httpStatusFromErrorOrResponse(error),
  message: `Failed to send direct message. ${messageFromError(error)}`,
});

/**
 * For direct messages to discord `User`s.
 */
export const mapDiscordUserSendFaults = (error: unknown): DiscordUserSendDMFault => {
  console.log('TODO: add a type for this error if it can be more specific, mapDiscordUserSendFaults', error);

  // if (error instanceof DiscordAPIError) {
  //   switch (error.code) {
  //     case 0: // Tbd
  //       return makeSomeFault();
  //   }
  // }

  return makeDiscordUserSendFailedFault(error);
};

export const makeDiscordGuildMembersFetchFailedFault = (error: unknown): DiscordMemberFetchFailedFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_FAULT_CODES.MEMBER_FETCH_FAILED,
  httpStatus: httpStatusFromErrorOrResponse(error),
  message: `Discord api failed when fetching users. ${messageFromError(error)}`,
});

export const makeDiscordGuildNotCachedFault = (guildId: string): DiscordGuildNotCachedFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_FAULT_CODES.GUILD_NOT_CACHED,
  httpStatus: 404,
  message: `The guild with id ${guildId} was not found in the bot's cache.`,
  payload: {
    guildId,
  },
});

export type CachedGuildResult = Result<Guild, DiscordGuildNotCachedFault>;

// is guilds.fetch needed?
export const getCachedGuildResult = (guildId: Snowflake, client: Client): CachedGuildResult => {
  const guild = client.guilds.cache.get(guildId);
  return guild === undefined ? fail(makeDiscordGuildNotCachedFault(guildId)) : ok(guild);
};

/**
 * Clicking the cancel button on a modal will still result in the timeout error being thrown.
 */
export const makeInteractionCollectorTimeoutFault = (): DiscordInteractionCollectorTimeoutFault => {
  return {
    _code: DISCORD_FAULT_CODES.INTERACTION_COLLECTOR_TIMEOUT,
    _type: SHARED_TYPE_NAMES.CODED_FAULT,
    message: 'The command was cancelled or timed out while waiting for a reply. Rerun it if needed.',
  };
};

/**
 * @param helperText Text to help the user fix the issue which will be appended a generic initial message.
 */
export const makeDiscordInvalidRoleSelectionFault = (
  helperText: string,
  selectedRoleNames?: string
): DiscordInvalidRoleSelectionFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_FAULT_CODES.INVALID_ROLE_SELECTION,
  httpStatus: 404,
  message: `Invalid role(s) selected: ${selectedRoleNames ? selectedRoleNames + ' - ' : ''} ${helperText}.`,
});

export const makeDiscordMemberAddToGuildFailedFault = (
  error: unknown,
  discordUserId: Snowflake,
  guildId: Snowflake
): DiscordMemberAddToGuildFailedFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_FAULT_CODES.MEMBER_ADD_TO_GUILD_FAILED,
  httpStatus: httpStatusFromErrorOrResponse(error),
  message: `Joining discord account to the discord server failed. ${messageFromError(error)}`,
  payload: {
    discordUserId,
    guildId,
  },
});

export const makeDiscordMemberBanFailedFault = (
  error: unknown,
  guildMember: GuildMember
): DiscordMemberBanFailedFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_FAULT_CODES.MEMBER_BAN_FAILED,
  httpStatus: httpStatusFromErrorOrResponse(error),
  message: `Failed to ban discord member with discord id ${guildMember.id}. ${messageFromError(error)}.`,
  payload: {
    discordUserId: guildMember.id,
  },
});

export const mapDiscordMemberBanFaults = (error: unknown, guildMember: GuildMember): DiscordMemberBanFault => {
  console.log('TODO: add a type for this error if it can be more specific, mapDiscordMemberBanFaults', error);

  // if (error instanceof DiscordAPIError) {
  //   switch (error.code) {
  //     case 0: // Tbd
  //       return makeSomeFault();
  //   }
  // }

  return makeDiscordMemberBanFailedFault(error, guildMember);
};

export const makeDiscordGuildBanFetchFailedFault = (error: unknown): DiscordGuildBanFetchFailedFault => {
  return {
    _type: SHARED_TYPE_NAMES.CODED_FAULT,
    _code: DISCORD_FAULT_CODES.GUILD_BAN_FETCH_FAILED,
    httpStatus: httpStatusFromErrorOrResponse(error),
    message: `There was a discord error when checking the ban list. Please try again. ${messageFromError(error)}.`,
  };
};

export const mapGuildBanFetchFaults = (error: unknown): DiscordGuildBanFetchFault => {
  console.log('TODO: add a type for this error if it can be more specific, mapGuildBanFetchFaults', error);

  // if (error instanceof DiscordAPIError) {
  //   switch (error.code) {
  //     case 0: // Tbd
  //       return makeSomeFault();
  //   }
  // }
  return makeDiscordGuildBanFetchFailedFault(error);
};

export const makeDiscordMemberBannedFault = (guildBan: GuildBan): DiscordMemberBannedFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_FAULT_CODES.MEMBER_BANNED,
  httpStatus: 500,
  message: `The discord user with username: ${guildBan.user.username} is banned${
    guildBan.reason ? ` with reason ${guildBan.reason}.` : '.'
  }`,
});

export const makeDiscordApiUserGetFailedFault = (error: unknown): DiscordApiUserGetFailedFault => ({
  _code: DISCORD_FAULT_CODES.DISCORD_API_USER_GET_FAILED,
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  message: `Retrieving the user account from discord's api failed. ${messageFromError(error)}.`,
  httpStatus: httpStatusFromErrorOrResponse(error),
});

/**
 * Maps errors for the Discord api get one user endpoints. If the errors don't overlap enough between these endpoints
 * a second error mapper should be made.
 * @see [Discord api /users/@me](https://discord.com/developers/docs/resources/user#get-current-user)
 * @see [Discord api /users/{user.id}](https://discord.com/developers/docs/resources/user#get-user)
 */
export const mapDiscordApiUserGetFaults = (error: unknown, _discordUserId?: Snowflake): DiscordApiUserGetOneFault => {
  console.log('TODO: add a type for this error if it can be more specific, mapDiscordApiUserGetFaults', error);

  // if (error instanceof DiscordAPIError) {
  //   switch (error.code) {
  //     case 0: // Tbd
  //       return makeSomeFault();
  //   }
  // }
  return makeDiscordApiUserGetFailedFault(error);
};

export const makeDiscordApiAccountNotFoundFault = (discordUserId: Snowflake): DiscordApiUserNotFoundFault => ({
  _code: DISCORD_FAULT_CODES.DISCORD_API_USER_NOT_FOUND,
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  httpStatus: 400,
  message: `The discord account was not found in the discord api.`,
  payload: {
    discordUserId,
  },
});

export const makeDiscordMemberKickFailedFault = (
  error: unknown,
  guildMember: GuildMember
): DiscordMemberKickFailedFault => {
  console.log('TODO: can this error be used in makeDiscordMemberKickFault() to improve the message?', error);

  return {
    _type: SHARED_TYPE_NAMES.CODED_FAULT,
    _code: DISCORD_FAULT_CODES.MEMBER_KICK_FAILED,
    httpStatus: httpStatusFromErrorOrResponse(error),
    message: `Failed to kick discord member with discord id ${guildMember.id}. ${messageFromError(error)}.`,
    payload: {
      discordUserId: guildMember.id,
    },
  };
};

/**
 * Maps {@link GuildMember.kick} errors into more descriptive types.
 */
export const mapGuildMemberKickFaults = (error: unknown, guildMember: GuildMember): DiscordMemberKickFault => {
  console.log('TODO: add a type for this error if it can be more specific, mapGuildMemberKickFaults', error);

  // if (error instanceof DiscordjsError) {
  //   switch (error.code) {
  //     case 0: // Tbd
  //       return makeSomeFault();
  //   }
  // }
  return makeDiscordMemberKickFailedFault(error, guildMember);
};

export const makeDiscordMemberNicknameUpdateFailedFault = (
  error: unknown,
  guildMember: GuildMember
): DiscordMemberSetNicknameFailedFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_FAULT_CODES.MEMBER_NICKNAME_UPDATE_FAILED,
  httpStatus: httpStatusFromErrorOrResponse(error),
  message: `Nickname update failed for user with discord id ${guildMember.id}. ${messageFromError(error)}.`,
  payload: {
    discordUserId: guildMember.id,
  },
});

/**
 * Maps {@link GuildMember.setNickname} errors into more descriptive types.
 */
export const mapGuildMemberSetNicknameFaults = (
  error: unknown,
  guildMember: GuildMember
): DiscordMemberSetNicknameFault => {
  console.log('TODO: add a type for this error if it can be more specific, mapGuildMemberSetNicknameFaults', error);

  // if (error instanceof DiscordjsError) {
  //   switch (error.code) {
  //     case 0: // Tbd
  //       return makeSomeFault();
  //   }
  // }
  return makeDiscordMemberNicknameUpdateFailedFault(error, guildMember);
};

export const makeDiscordMemberNotBannableFault = (guildMember: GuildMember): DiscordMemberNotBannableFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_FAULT_CODES.MEMBER_NOT_BANNABLE,
  httpStatus: 500,
  message: `The discord user with discord id ${guildMember.id} is not bannable by the bot. Make sure the bot has the correct permissions.`,
  payload: {
    discordUserId: guildMember.id,
  },
});

/**
 * Maps {@link GuildMemberManager.fetch} errors into more descriptive types.
 */
export const mapGuildMemberFetchFaults = (error: unknown, discordUserId?: Snowflake): DiscordMemberFetchFault => {
  console.log('TODO: add a type for this error if it can be more specific, mapGuildMemberFetchFaults', error);

  if (error instanceof DiscordAPIError) {
    switch (error.code) {
      // 10013 & 10007 don't happen when passing an array of ids.
      case 10013: // 'Unknown User' when guild.members.fetch(discordId) is a invalid id.
      case 10007: // 'Unknown Member' when guild.members.fetch(discordId) is not found or banned.
        return makeDiscordMemberNotInGuildFault(discordUserId);
    }
  }

  return makeDiscordGuildMembersFetchFailedFault(error);
};

export const makeDiscordMemberNotInGuildFault = (discordUserId?: Snowflake): DiscordMemberNotInGuildFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_FAULT_CODES.MEMBER_NOT_IN_GUILD,
  message: discordUserId
    ? `Discord user with id ${discordUserId} is not in the server.`
    : `The requested discord user is not in the server.`,
  httpStatus: 404,
  payload: {
    discordUserId,
  },
});

export const makeDiscordMemberNotManageableFault = (guildMember: GuildMember): DiscordMemberNotManageableFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_FAULT_CODES.MEMBER_NOT_MANAGEABLE,
  httpStatus: 400,
  message: `The discord user with discord id ${guildMember.id} is not manageable by the bot. Make sure the bot has the correct permissions. In the server settings role list the bot can only manage roles and users with roles that the bot is above.`,
  payload: {
    discordUserId: guildMember.id,
  },
});

export const makeDiscordMemberNotKickableFault = (guildMember: GuildMember): DiscordMemberNotKickableFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_FAULT_CODES.MEMBER_NOT_KICKABLE,
  httpStatus: 500,
  message: `The discord user with discord id ${guildMember.id} is not kickable by the bot. Make sure the bot has the correct permissions.`,
  payload: {
    discordUserId: guildMember.id,
  },
});

export const makeDiscordMemberRolesUpdateFailedFault = (
  error: unknown,
  guildMember: GuildMember
): DiscordMemberRoleUpdateFailedFault => ({
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  _code: DISCORD_FAULT_CODES.MEMBER_ROLES_UPDATE_FAILED,
  httpStatus: httpStatusFromErrorOrResponse(error),
  message: `Role update failed for user with discord id ${guildMember.id}. ${messageFromError(error)}.`,
  payload: {
    discordUserId: guildMember.id,
  },
});

/**
 * Maps {@link GuildMemberRoleManager.set}, {@link GuildMemberRoleManager.add},
 * and {@link GuildMemberRoleManager.remove} errors into more descriptive types.
 */
export const mapGuildMemberRolesUpdateFaults = (
  error: unknown,
  guildMember: GuildMember
): DiscordMemberRolesUpdateFault => {
  console.log('TODO: add a type for this error if it can be more specific, mapGuildMemberRolesUpdateFaults', error);

  // if (error instanceof DiscordjsError) {
  //   switch (error.code) {
  //     case 0: // Tbd
  //       return makeSomeFault();
  //   }
  // }
  return makeDiscordMemberRolesUpdateFailedFault(error, guildMember);
};

export const makeDiscordMemberUnbanFailedFault = (error: unknown): DiscordMemberUnbanFailedFault => {
  console.log('TODO: can this error be used in makeDiscordMemberUnbanFault() to improve the message?', error);

  return {
    _code: DISCORD_FAULT_CODES.MEMBER_UNBAN_FAILED,
    _type: SHARED_TYPE_NAMES.CODED_FAULT,
    httpStatus: 500,
    message: `Failed to unban the requested account. ${messageFromError(error)}.`,
  };
};

export const makeDiscordMessageUnsentLengthExceeded = (message: string): DiscordMessageUnsentLengthExceeded => ({
  _code: DISCORD_FAULT_CODES.MESSAGE_UNSENT_LENGTH_EXCEEDED,
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  httpStatus: 400,
  message: `The message was not sent due to exceeding the length limit of ${MAX_MESSAGE_LENGTH} by ${
    message.length - MAX_MESSAGE_LENGTH
  }.`,
});

export const makeDiscordMemberBanNotFoundFault = (discordUserId: Snowflake): DiscordMemberBanNotFoundFault => ({
  _code: DISCORD_FAULT_CODES.MEMBER_BAN_NOT_FOUND,
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  httpStatus: 400,
  message: `The discord user with id ${discordUserId} wasn't found in the ban list.`,
  payload: {
    discordUserId,
  },
});

export const makeSlashCommandNotFoundFault = (errorMessage: string): DiscordSlashCommandNotFoundFault => {
  return {
    _code: DISCORD_FAULT_CODES.SLASH_COMMAND_NOT_FOUND,
    _type: SHARED_TYPE_NAMES.CODED_FAULT,
    message: errorMessage,
  };
};

export const makeSlashCommandSetupFault = (message: string): DiscordSlashCommandSetupFault => ({
  _code: DISCORD_FAULT_CODES.SLASH_COMMAND_SETUP_FAULT,
  _type: SHARED_TYPE_NAMES.CODED_FAULT,
  message: `This slash command was setup incorrectly. Please send this message to the server admin. ${message}.`,
});

export type RunChatInteractionFault = DiscordInteractionCollectorTimeoutFault | UnidentifiedFault;

/**
 * Error mapping logic for errors that made it out of a slash command when executed in `use-commands.ts`. The command
 * will be replied to with the error message from here.
 * Errors should be handled in the slash command unless they are common and can be universally handled here.
 */

export const mapRunChatInteractionErrors = (error: unknown): RunChatInteractionFault => {
  if (error instanceof DiscordjsError) {
    if (error.code === 'InteractionCollectorError' && error.message.includes('reason: time')) {
      return makeInteractionCollectorTimeoutFault();
    }
  }
  return makeUnidentifiedFault(error);
};
