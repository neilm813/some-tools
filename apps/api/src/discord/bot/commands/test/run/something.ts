import { makeModularSlashSubcommand } from '@some-tools/shared/discord/some-bot/data-access';

export const runSomethingSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) => subcommand.setName('something').setDescription('tests something'),
  runChatInputCommandInCachedGuild: async (interaction) => {
    await interaction.reply('Testing');
  },
});
