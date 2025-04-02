import { Events, type GuildMember, inlineCode } from 'discord.js';

import { serverMemberUpdateLinkedGuildMember } from '@some-tools/shared/api/data-access';
import {
  formatSimpleError,
  makeDiscordMemberNotLinkedButInGuildFault,
} from '@some-tools/shared/discord/some-bot/data-access';
import {
  forwardDiscordEventToLearn,
  sendEventErrorToLogChannel,
  sendToLogChannel,
} from '@some-tools/shared/discord/some-bot/data-access';
import { PRODUCTION } from '@some-tools/shared/discord/some-bot/environments';
import { makeUnidentifiedFault } from '@some-tools/shared/utils/common';
import { isFail, tryFailAsync } from '@some-tools/shared/utils/try-fail';

import { discordClient } from '../config';

const updateGuildMember = async (guildMember: GuildMember) => {
  const { guild } = guildMember;

  const result = await serverMemberUpdateLinkedGuildMember({
    guildId: guild.id,
    emailOrDiscordId: guildMember.id,
  });

  if (isFail(result)) {
    let logMessage = `${guildMember} joined the server but failed to be updated. If they are linked in the database, updating can be retried with the sync-linked-discord-account command. Reason:\n`;
    const fault = result.fault;

    if (fault._code === 'DB_RECORD_NOT_FOUND' || fault._code === 'MEMBER_NOT_LINKED') {
      const updatedFault = makeDiscordMemberNotLinkedButInGuildFault(guildMember.id);
      logMessage += updatedFault.message;
    } else {
      logMessage += fault.message;
    }

    if (fault._code === 'DB_RECORD_NOT_FOUND') {
      const dmResult = await dmGuildMemberToLinkAccount(guildMember);

      if (isFail(dmResult)) {
        logMessage += `\nDMing the user with instructions to link their account failed with reason: ${dmResult.fault.message}\nAsk them for their email then run /user update link-discord-account on them.`;
      }
    }

    await sendToLogChannel(guild, formatSimpleError(logMessage + '\n---'));
  }
};

const dmGuildMemberToLinkAccount = async (guildMember: GuildMember) => {
  return tryFailAsync(
    () =>
      guildMember.send(
        `Welcome to the ${guildMember.guild.name} server!\n\n${formatSimpleError(
          `Please link your account by typing ${inlineCode(
            '/some-user update link-discord-account'
          )} and then follow the prompts.`
        )}`
      ),
    makeUnidentifiedFault
  );
};

discordClient.on(
  Events.GuildMemberAdd,
  /**
   * @see [docs](https://discord.js.org/#/docs/discord.js/14.5.0/class/Client?scrollTo=e-guildMemberAdd)
   */
  async (guildMember) => {
    const { guild } = guildMember;

    try {
      if (guildMember.user.bot) {
        return;
      }

      forwardDiscordEventToLearn(PRODUCTION, guild, Events.GuildMemberAdd, guildMember).catch(() => null);

      await updateGuildMember(guildMember);
    } catch (error) {
      sendEventErrorToLogChannel(guild, Events.GuildMemberAdd, error);
    }
  }
);
