import { Events } from 'discord.js';

import { runSlashCommand } from '@some-tools/shared/discord/some-bot/data-access';

import { discordClient } from '../config';

discordClient.on(
  Events.InteractionCreate,
  /**
   * @see [docs](https://discord.js.org/#/docs/discord.js/14.5.0/class/Client?scrollTo=e-interactionCreate)
   */
  async (interaction) => {
    try {
      await runSlashCommand(interaction, discordClient.slashCommands);
    } catch (error) {
      console.error(error);
    }
  }
);
