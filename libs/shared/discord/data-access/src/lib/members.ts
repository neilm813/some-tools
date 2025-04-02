import {
  ClientEvents,
  Collection,
  type Guild,
  type GuildBan,
  GuildMember,
  GuildMemberRoleManager, // eslint-disable-line
  Message,
  type Role,
  type RoleResolvable,
  type Snowflake,
  ThreadMember,
  User,
  type UserResolvable,
} from 'discord.js';

import type {
  DiscordGuildBanFetchUtilFault,
  DiscordGuildNotCachedFault,
  DiscordMemberAddToGuildUtilFault,
  DiscordMemberBanUtilFault,
  DiscordMemberFetchUtilFault,
  DiscordMemberFetchUtilLenientFault,
  DiscordMemberKickUtilFault,
  DiscordMemberNotBannableFault,
  DiscordMemberNotKickableFault,
  DiscordMemberNotManageableFault,
  DiscordMemberRolesUpdateUtilFault,
  DiscordMemberSetNicknameUtilFault,
  DiscordMemberUnbanUtilFault,
  DiscordUserSendDMUtilFault,
  GuildOrGetGuildCallback,
} from '@some-tools/shared/discord/types';
import { fail, isFail, ok, type Result, tryFailAsync } from '@some-tools/shared/utils/try-fail';

import { MAX_NICKNAME_LENGTH } from './constants';
import {
  makeDiscordMemberAddToGuildFailedFault,
  makeDiscordMemberBannedFault,
  makeDiscordMemberBanNotFoundFault,
  makeDiscordMemberNicknameUpdateFailedFault,
  makeDiscordMemberNotBannableFault,
  makeDiscordMemberNotInGuildFault,
  makeDiscordMemberNotKickableFault,
  makeDiscordMemberNotManageableFault,
  makeDiscordMemberUnbanFailedFault,
  mapDiscordMemberBanFaults,
  mapDiscordUserSendFaults,
  mapGuildBanFetchFaults,
  mapGuildMemberFetchFaults,
  mapGuildMemberKickFaults,
  mapGuildMemberRolesUpdateFaults,
} from './error-handling';
import { roleIdFromResolvable } from './roles';

export type GuildMemberOrMemberWithRoles = GuildMember | { roles: Snowflake[] };

export const isGuildMemberElseMemberWithRoles = (member: GuildMemberOrMemberWithRoles): member is GuildMember =>
  member instanceof GuildMember;

export const guildOrCallbackHandler = (
  guildOrCallback: GuildOrGetGuildCallback
): Result<Guild, DiscordGuildNotCachedFault> =>
  typeof guildOrCallback === 'function' ? guildOrCallback() : ok(guildOrCallback);

export const doesMemberHaveRole = (member: GuildMemberOrMemberWithRoles, role: RoleResolvable) =>
  isGuildMemberElseMemberWithRoles(member)
    ? member.roles.cache.has(roleIdFromResolvable(role))
    : member.roles.some((id) => id === roleIdFromResolvable(role));

export const doesMemberHaveAnyOfRoles = (
  member: GuildMemberOrMemberWithRoles,
  targetRoles: Collection<Snowflake, Role>
) =>
  isGuildMemberElseMemberWithRoles(member)
    ? member.roles.cache.filter((role) => targetRoles.has(role.id)).size > 0
    : member.roles.filter((id) => targetRoles.has(id)).length > 0;

/**
 * The bot's role in the server's role settings must be above roles to manage roles or members with those roles.
 */
export const guildMemberIsManageable = (
  guildMember: GuildMember
): Result<GuildMember, DiscordMemberNotManageableFault> =>
  guildMember.manageable ? ok(guildMember) : fail(makeDiscordMemberNotManageableFault(guildMember));

/**
 * See {@link guildMemberIsManageable} comments.
 */
export const guildMemberIsKickable = (guildMember: GuildMember): Result<GuildMember, DiscordMemberNotKickableFault> =>
  guildMember.kickable ? ok(guildMember) : fail(makeDiscordMemberNotKickableFault(guildMember));

/**
 * See {@link guildMemberIsManageable} comments.
 */
export const guildMemberIsBannable = (guildMember: GuildMember): Result<GuildMember, DiscordMemberNotBannableFault> =>
  guildMember.bannable ? ok(guildMember) : fail(makeDiscordMemberNotBannableFault(guildMember));

export const userResolvableToId = (userResolvable: UserResolvable): Snowflake => {
  if (
    userResolvable instanceof GuildMember ||
    userResolvable instanceof User ||
    userResolvable instanceof ThreadMember
  ) {
    return userResolvable.id;
  }

  if (userResolvable instanceof Message) {
    return userResolvable.author.id;
  }

  return userResolvable;
};

/**
 * @param accessToken The user must grant oauth access which happens on the join page.
 */
export const guildMemberAdd = async (
  discordUserId: Snowflake,
  accessToken: string,
  guildOrCallback: GuildOrGetGuildCallback
): Promise<Result<GuildMember, DiscordMemberAddToGuildUtilFault>> => {
  const guildResult = guildOrCallbackHandler(guildOrCallback);

  if (isFail(guildResult)) {
    return guildResult;
  }

  const guild = guildResult.value;

  return tryFailAsync(
    () => {
      return guild.members.add(discordUserId, { accessToken });
    },
    (error) => makeDiscordMemberAddToGuildFailedFault(error, discordUserId, guild.id)
  );
};

export const guildBanFetch = async (
  guildOrCallback: GuildOrGetGuildCallback,
  userResolvable: UserResolvable
): Promise<Result<{ isBanned: true; guildBan: GuildBan } | { isBanned: false }, DiscordGuildBanFetchUtilFault>> => {
  const guildResult = guildOrCallbackHandler(guildOrCallback);

  if (isFail(guildResult)) {
    return guildResult;
  }

  const bansResult = await tryFailAsync(() => guildResult.value.bans.fetch(), mapGuildBanFetchFaults);

  if (isFail(bansResult)) {
    return bansResult;
  }

  const bans = bansResult.value;
  const userId = userResolvableToId(userResolvable);
  const guildBan = bans.get(userId);

  if (!guildBan) {
    return ok({ isBanned: false });
  }

  return ok({ isBanned: true, guildBan });
};

// Couldn't get this to work with one arrow function and an overload type.
export async function guildMemberFetch(
  guildOrCallback: GuildOrGetGuildCallback,
  userResolvable: UserResolvable,
  strictFind: true
): Promise<Result<GuildMember, DiscordMemberFetchUtilFault>>;
export async function guildMemberFetch(
  guildOrCallback: GuildOrGetGuildCallback,
  userResolvable: UserResolvable,
  strictFind: false
): Promise<Result<GuildMember | null, DiscordMemberFetchUtilLenientFault>>;
/**
 * @param strictFind `true` to include faults if not found or banned.
 */
export async function guildMemberFetch(
  guildOrCallback: GuildOrGetGuildCallback,
  userResolvable: UserResolvable,
  strictFind: boolean
): Promise<Result<GuildMember | null, DiscordMemberFetchUtilFault>> {
  const guildResult = guildOrCallbackHandler(guildOrCallback);

  if (isFail(guildResult)) {
    return guildResult;
  }

  const guild = guildResult.value;
  const discordUserId = userResolvableToId(userResolvable);

  if (strictFind) {
    const banResult = await guildBanFetch(guild, discordUserId);

    if (isFail(banResult)) {
      return banResult;
    }

    if (banResult.value.isBanned) {
      return fail(makeDiscordMemberBannedFault(banResult.value.guildBan));
    }
  }

  const fetchedMembersResult = await tryFailAsync(
    () => guild.members.fetch({ user: [discordUserId] }),
    (error) => mapGuildMemberFetchFaults(error, discordUserId)
  );

  if (isFail(fetchedMembersResult)) {
    return fetchedMembersResult;
  }

  const guildMember = fetchedMembersResult.value.first();

  if (!guildMember) {
    if (strictFind) {
      return fail(makeDiscordMemberNotInGuildFault(discordUserId));
    }
    return ok(null);
  }

  return ok(guildMember);
}

/**
 * Sets the nickname if it's not already the same. Used when first or last name or roles are updating since some parts
 * of the nickname are based on roles.
 *
 * * This will trigger the `guildMemberUpdate` event
 * @see `guild-member-update.ts`
 * @throws If {@link getKeyRolesInfo key roles} are setup incorrectly and need to be fixed. Handled in outer catch.
 */
export const guildMemberSetNickname = async (
  guildMember: GuildMember,
  newNickname: string
): Promise<Result<GuildMember, DiscordMemberSetNicknameUtilFault>> => {
  const manageableResult = guildMemberIsManageable(guildMember);

  if (isFail(manageableResult)) {
    return manageableResult;
  }

  if (guildMember.nickname === newNickname) {
    return ok(guildMember);
  }

  return tryFailAsync(
    () => {
      return guildMember.setNickname(newNickname.slice(0, MAX_NICKNAME_LENGTH));
    },
    (error) => makeDiscordMemberNicknameUpdateFailedFault(error, guildMember)
  );
};

/**
 * Sets the roles if it's not already the same.
 *
 * * This will trigger the `guildMemberUpdate` event
 * @see `guild-member-update.ts`
 */
export const guildMemberSetRoles = async (
  guildMember: GuildMember,
  resolvableRoles: RoleResolvable[] | Collection<Snowflake, Role>
): Promise<Result<GuildMember, DiscordMemberRolesUpdateUtilFault>> => {
  const manageableResult = guildMemberIsManageable(guildMember);

  if (isFail(manageableResult)) {
    return manageableResult;
  }

  const newRoleIds = Array.isArray(resolvableRoles)
    ? resolvableRoles.map((roleResolvable) => roleIdFromResolvable(roleResolvable))
    : Array.from(resolvableRoles.keys());

  const currentManagedRoles = guildMember.roles.cache.filter((role) => role.managed);

  const cleanedRoleIds = Array.from(
    // Dedupe with a Set - discord.js error code: 50035 roles SET_TYPE_ALREADY_CONTAINS_VALUE
    new Set(
      newRoleIds
        // Remove any roles that aren't found in the guild.
        .filter((roleId) => guildMember.guild.roles.cache.has(roleId))
        // Avoid discord.js 'Missing Permissions' error
        // Ensure all the guild member's managed roles are included. They cannot be removed.
        .concat(Array.from(currentManagedRoles.keys()))
    )
  );

  const roleDifferences = guildMember.roles.cache.difference(
    new Collection<Snowflake, Snowflake>(cleanedRoleIds.map((id) => [id, id]))
  );

  // Save a request to discord if no changes are needed.
  if (roleDifferences.size === 0) {
    return ok(guildMember);
  }

  return tryFailAsync(
    () => guildMember.roles.set(cleanedRoleIds),
    (error) => mapGuildMemberRolesUpdateFaults(error, guildMember)
  );
};

/**
 * Kicks the passed in guild member.
 * * Triggers guildMemberRemove event.
 * @throws If {@link getKeyRolesInfo key roles} are setup incorrectly and need to be fixed. Handled in outer catch.
 */
export const guildMemberKick = async (
  guildMember: GuildMember
): Promise<Result<GuildMember, DiscordMemberKickUtilFault>> => {
  const kickableResult = guildMemberIsKickable(guildMember);

  if (isFail(kickableResult)) {
    return kickableResult;
  }

  return tryFailAsync(
    () => {
      return guildMember.kick();
    },
    (error) => mapGuildMemberKickFaults(error, guildMember)
  );
};

export const unban = async (
  guildOrCallback: GuildOrGetGuildCallback,
  userResolvable: UserResolvable
): Promise<Result<User, DiscordMemberUnbanUtilFault>> => {
  const guildResult = guildOrCallbackHandler(guildOrCallback);

  if (isFail(guildResult)) {
    return guildResult;
  }

  const guild = guildResult.value;
  const unbanResult = await tryFailAsync(() => guild.members.unban(userResolvable), makeDiscordMemberUnbanFailedFault);

  if (isFail(unbanResult)) {
    return unbanResult;
  }

  const unbanData = unbanResult.value;

  if (unbanData === null) {
    return fail(makeDiscordMemberBanNotFoundFault(userResolvableToId(userResolvable)));
  }

  return ok(unbanData);
};

// Add BanOption params? This will require adding these options to the slash command. I'm not sure what the limit's are on deleteMessageSeconds.
// The GUI shows options: 0, 1, 6, 12, or 24 hours, or 3 or 7 days.
export const guildMemberBan = async (
  guildMember: GuildMember
): Promise<Result<GuildMember, DiscordMemberBanUtilFault>> => {
  const bannableResult = guildMemberIsBannable(guildMember);

  if (isFail(bannableResult)) {
    return bannableResult;
  }

  return tryFailAsync(
    () => guildMember.ban({ deleteMessageSeconds: 86400 }),
    (error) => mapDiscordMemberBanFaults(error, guildMember)
  );
};

export const userSendDM = async (
  user: User,
  ...sendArgs: Parameters<User['send']>
): Promise<Result<Message<false>, DiscordUserSendDMUtilFault>> =>
  tryFailAsync(() => user.send(...sendArgs), mapDiscordUserSendFaults);

// Expand to more events as needed.
type UserIdFromSomeEvents = Pick<
  ClientEvents,
  'messageCreate' | 'messageReactionAdd' | 'guildMemberAdd' | 'voiceStateUpdate'
>;
export const userIdFromEvent: {
  [Key in keyof UserIdFromSomeEvents]: (...args: UserIdFromSomeEvents[Key]) => Snowflake | undefined;
} = {
  guildMemberAdd: (member) => member.id,
  messageCreate: (message) => message.member?.id,
  messageReactionAdd: (reaction) => reaction.message.author?.id,
  voiceStateUpdate: (oldState) => oldState.id,
};
