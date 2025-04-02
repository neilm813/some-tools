import {
  type Guild,
  type GuildMember,
  type User,
  type GuildMemberRoleManager, // eslint-disable-line
  type Message,
} from 'discord.js';

import { type DiscordServerMember } from '@some-tools/shared/api/types';
import {
  guildBanFetch,
  guildMemberFetch,
  guildMemberKick,
  guildMemberSetNickname,
  guildMemberSetRoles,
  userSendDM,
} from '@some-tools/shared/discord/some-bot/data-access';
import {
  DiscordMemberLinkedFetchUtilFault,
  DiscordMemberLinkedFetchUtilLenientFault,
  DiscordMemberLinkedKickUtilFault,
  DiscordMemberLinkedKickUtilLenientFault,
  DiscordMemberLinkedSendDMUtilFault,
  DiscordMemberLinkedUpdateOneFault,
  DiscordMemberLinkedUpdateOneLenientFault,
} from '@some-tools/shared/discord/some-bot/types';
import type { GuildOrGetGuildCallback } from '@some-tools/shared/discord/types';
import { fail, isFail, ok, type Result } from '@some-tools/shared/utils/try-fail';

import {
  makeDiscordMemberLinkedBannedFault,
  makeDiscordMemberLinkedNotInGuildFault,
  makeDiscordMemberNotLinkedFault,
} from './error-handling';
import { getKeyRolesInfo } from './keyRolesInfo';

export async function guildMemberLinkedFetch(
  guildOrCallback: GuildOrGetGuildCallback,
  serverMember: DiscordServerMember,
  strictFind: true
): Promise<Result<GuildMember, DiscordMemberLinkedFetchUtilFault>>;
export async function guildMemberLinkedFetch(
  guildOrCallback: GuildOrGetGuildCallback,
  serverMember: DiscordServerMember,
  strictFind: false
): Promise<Result<GuildMember | null, DiscordMemberLinkedFetchUtilLenientFault>>;
/**
 * @param strictFind `true` to include faults if not linked or not found.
 */
export async function guildMemberLinkedFetch(
  guildOrCallback: GuildOrGetGuildCallback,
  serverMember: DiscordServerMember,
  strictFind: boolean
): Promise<Result<GuildMember | null, DiscordMemberLinkedFetchUtilFault>> {
  const memberDiscordId = serverMember.discordId;

  if (memberDiscordId === null) {
    if (strictFind) {
      return fail(makeDiscordMemberNotLinkedFault(serverMember));
    }
    return ok(null);
  }

  const banResult = await guildBanFetch(guildOrCallback, memberDiscordId);

  if (isFail(banResult)) {
    return banResult;
  }

  if (banResult.value.isBanned) {
    return fail(makeDiscordMemberLinkedBannedFault(banResult.value.guildBan, serverMember));
  }

  const foundGuildMemberResult = await guildMemberFetch(guildOrCallback, memberDiscordId, false);

  if (isFail(foundGuildMemberResult)) {
    return foundGuildMemberResult;
  }

  const guildMember = foundGuildMemberResult.value;

  if (!guildMember) {
    if (strictFind) {
      return fail(makeDiscordMemberLinkedNotInGuildFault(serverMember));
    }
    return ok(null);
  }

  return ok(guildMember);
}

export const guildMemberLinkedDM = async (
  guildOrCallback: GuildOrGetGuildCallback,
  serverMember: DiscordServerMember,
  ...messageArgs: Parameters<User['send']>
): Promise<Result<Message<false>, DiscordMemberLinkedSendDMUtilFault>> => {
  const guildMemberResult = await guildMemberLinkedFetch(guildOrCallback, serverMember, true);

  if (isFail(guildMemberResult)) {
    return guildMemberResult;
  }

  return userSendDM(guildMemberResult.value.user, ...messageArgs);
};

/**
 * Formats nicknames consistently but does not touch casing. If casing is wrong, update the name in the db to the
 * correct casing because some names have casing within them that has to be preserved, such as: `DeShawn`.
 * @throws If key roles from {@link getKeyRolesInfo} are setup incorrectly and need to be fixed. Handled in outer catch.
 */
const createSomeNickname = (guild: Guild, serverMember: DiscordServerMember) => {
  const keyRolesInfo = getKeyRolesInfo(guild);
  const formattedFullName = `${serverMember.firstName}_${serverMember.lastName}`.replace(' ', '');
  return keyRolesInfo.isEmployee(serverMember) ? `some_${formattedFullName}` : formattedFullName;
};

export const guildMemberLinkedSetSomeNickname = (guildMember: GuildMember, serverMember: DiscordServerMember) =>
  guildMemberSetNickname(guildMember, createSomeNickname(guildMember.guild, serverMember));

export async function guildMemberLinkedSync(
  guildOrCallback: GuildOrGetGuildCallback,
  serverMember: DiscordServerMember,
  strictFind: true
): Promise<Result<GuildMember, DiscordMemberLinkedUpdateOneFault>>;
export async function guildMemberLinkedSync(
  guildOrCallback: GuildOrGetGuildCallback,
  serverMember: DiscordServerMember,
  strictFind: false
): Promise<Result<GuildMember | null, DiscordMemberLinkedUpdateOneLenientFault>>;
/**
 * Fetches the guild member related to the given server member and updates the guild member's roles and nickname based
 * on the server member.
 *
 * * This will trigger the `guildMemberUpdate` event
 * @see `guild-member-update.ts`
 * @param guildOrCallback If you don't need the guild result, you can pass in `makeGetGuildCallback(guildId)` function
 *    from the `discord-client.ts`.
 * @throws If {@link getKeyRolesInfo key roles} are setup incorrectly and need to be fixed. Handled in outer catch.
 */
export async function guildMemberLinkedSync(
  guildOrCallback: GuildOrGetGuildCallback,
  serverMember: DiscordServerMember,
  strictFind: boolean
): Promise<Result<GuildMember | null, DiscordMemberLinkedUpdateOneFault>> {
  if (strictFind) {
    const linkedGuildMemberResult = await guildMemberLinkedFetch(guildOrCallback, serverMember, true);

    if (isFail(linkedGuildMemberResult)) {
      return linkedGuildMemberResult;
    }

    const guildMember = linkedGuildMemberResult.value;
    const roleUpdateResult = await guildMemberSetRoles(guildMember, serverMember.roles);

    if (isFail(roleUpdateResult)) {
      return roleUpdateResult;
    }

    return guildMemberLinkedSetSomeNickname(guildMember, serverMember);
  }

  const linkedGuildMemberResult = await guildMemberLinkedFetch(guildOrCallback, serverMember, false);

  if (isFail(linkedGuildMemberResult)) {
    return linkedGuildMemberResult;
  }

  const guildMember = linkedGuildMemberResult.value;

  if (!guildMember) {
    return ok(null);
  }

  const roleUpdateResult = await guildMemberSetRoles(guildMember, serverMember.roles);

  if (isFail(roleUpdateResult)) {
    return roleUpdateResult;
  }

  return guildMemberLinkedSetSomeNickname(guildMember, serverMember);

  /*
  If the guild member's roles are updated due to being different from the server member, that will trigger the
  `guild-member-update.ts` event.
  */

  /*
  Since roles or server member first or last name may have been updated, the nickname will be regenerated and updated
  if it's different. If the nickname is updated, this will also trigger `guild-member-update.ts` event.

  `guild-member-update.ts` may be triggered from our own api updating the related guild member, OR from the
  guild member being updated from the discord GUI, such as their roles being changed without a command.

  It's not possible to know in `guild-member-update.ts` which of these is the cause for the event firing, so an
  endpoint specific to the `guild-member-update.ts` event will be called in case the guild member was updated from
  the GUI and therefore the DB needs to be updated to stay in sync.

  This endpoint will make sure to not trigger any more `guild-member-update.ts` events to avoid an infinite request
  loop.
  */
}

export async function guildMemberLinkedKick(
  guildOrCallback: GuildOrGetGuildCallback,
  serverMember: DiscordServerMember,
  strictFind: true
): Promise<Result<GuildMember, DiscordMemberLinkedKickUtilFault>>;
export async function guildMemberLinkedKick(
  guildOrCallback: GuildOrGetGuildCallback,
  serverMember: DiscordServerMember,
  strictFind: false
): Promise<Result<GuildMember | null, DiscordMemberLinkedKickUtilLenientFault>>;
/**
 * Kicks the linked guild member.
 * @throws If {@link getKeyRolesInfo} key roles are setup incorrectly and need to be fixed. Handled in outer catch.
 * @param strictFind `true` includes not found and banned faults.
 */
export async function guildMemberLinkedKick(
  guildOrCallback: GuildOrGetGuildCallback,
  serverMember: DiscordServerMember,
  strictFind: boolean
): Promise<Result<GuildMember | null, DiscordMemberLinkedKickUtilFault>> {
  if (strictFind) {
    const linkedGuildMemberResult = await guildMemberLinkedFetch(guildOrCallback, serverMember, true);

    if (isFail(linkedGuildMemberResult)) {
      return linkedGuildMemberResult;
    }

    return guildMemberKick(linkedGuildMemberResult.value);
  }

  const linkedGuildMemberResult = await guildMemberLinkedFetch(guildOrCallback, serverMember, false);

  if (isFail(linkedGuildMemberResult)) {
    return linkedGuildMemberResult;
  }

  const guildMember = linkedGuildMemberResult.value;

  if (!guildMember) {
    return ok(null);
  }

  return guildMemberKick(guildMember);
}
