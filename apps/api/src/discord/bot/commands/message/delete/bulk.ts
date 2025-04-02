import { ChannelType, TextChannel } from 'discord.js';

import {
  BULK_MESSAGE_DELETE_MAX,
  formatSimpleSuccess,
  makeModularSlashSubcommand,
} from '@some-tools/shared/discord/some-bot/data-access';

export const deleteBulkSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('bulk')
      .setDescription('Deletes the last N amount of messages from the specified channel.')
      .addChannelOption((option) =>
        option
          .setName('target-channel')
          .setDescription('The channel from which messages should be deleted.')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName('amount-to-delete')
          .setDescription('Max 100. The amount of recent messages to remove.')
          .setMinValue(1)
          .setMaxValue(BULK_MESSAGE_DELETE_MAX)
          .setRequired(true)
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    const { options } = interaction;
    const targetChannel = options.getChannel('target-channel', true) as TextChannel;
    const amountToDelete = options.getInteger('amount-to-delete', true);
    await targetChannel.bulkDelete(amountToDelete);
    await interaction.reply(formatSimpleSuccess(`Deleted ${amountToDelete} messages from ${targetChannel}`));
  },
});
