import { Events, type GuildMember, type PartialGuildMember } from 'discord.js';

import { serverMemberUpdateOne } from '@some-tools/shared/api/data-access';
import {
  formatSimpleError,
  guildMemberLinkedSetSomeNickname,
  makeDiscordMemberNotLinkedButInGuildFault,
} from '@some-tools/shared/discord/some-bot/data-access';
import { sendEventErrorToLogChannel, sendToLogChannel } from '@some-tools/shared/discord/some-bot/data-access';
import { isOk } from '@some-tools/shared/utils/try-fail';

import { discordClient } from '../config';

const updateLinkedServerMember = async (
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember
): Promise<void> => {
  const haveRolesChanged = oldMember.roles.cache.difference(newMember.roles.cache).size > 0;
  const isUpdatedNeeded = haveRolesChanged; /* || didSomethingElseChange */

  if (!isUpdatedNeeded) {
    return;
  }

  /*
  Since discord's state is the more important truth, the new members roles will replace the current roles
  for this user in the database.
  */
  const updatedServerMemberResult = await serverMemberUpdateOne(
    { emailOrDiscordId: newMember.id, guildId: newMember.guild.id },
    { roles: Array.from(newMember.roles.cache.keys()) }
  );

  if (isOk(updatedServerMemberResult)) {
    await guildMemberLinkedSetSomeNickname(newMember, updatedServerMemberResult.value);
  } else {
    const fault = updatedServerMemberResult.fault;
    let faultMessage = fault.message;

    if (fault._code === 'DB_RECORD_NOT_FOUND') {
      const newFault = makeDiscordMemberNotLinkedButInGuildFault(newMember.id);
      faultMessage = newFault.message;
    }

    await sendToLogChannel(
      newMember.guild,
      formatSimpleError(`A guild member was updated in the server:\n${faultMessage}`)
    );
  }
};

discordClient.on(
  Events.GuildMemberUpdate,
  /**
   * @see [docs](https://discord.js.org/#/docs/discord.js/14.5.0/class/Client?scrollTo=e-guildMemberUpdate)
   */
  async (oldMember, newMember) => {
    try {
      if (newMember.user.bot) {
        return;
      }

      await updateLinkedServerMember(oldMember, newMember);
    } catch (error) {
      sendEventErrorToLogChannel(newMember.guild, Events.GuildMemberUpdate, error);
    }
  }
);
