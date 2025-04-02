import { Events } from 'discord.js';

import { sendEventErrorToLogChannel } from '@some-tools/shared/discord/some-bot/data-access';
import { forwardDiscordEventToLearn } from '@some-tools/shared/discord/some-bot/data-access';

import { PRODUCTION } from '../../../environments';
import { discordClient } from '../config';

discordClient.on(
  Events.MessageReactionAdd,
  /**
   * @see [docs](https://discord.js.org/#/docs/discord.js/14.5.0/class/Client?scrollTo=e-messageReactionAdd)
   */
  async (messageReaction, user) => {
    try {
      if (user.bot) {
        return;
      }

      forwardDiscordEventToLearn(
        PRODUCTION,
        messageReaction.message.guild,
        Events.MessageReactionAdd,
        messageReaction,
        user
      ).catch(() => null);
    } catch (error) {
      sendEventErrorToLogChannel(messageReaction.message.guild, Events.MessageReactionAdd, error);
    }
  }
);
