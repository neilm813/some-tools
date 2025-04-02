import { PermissionFlagsBits } from 'discord.js';

import { makeModularSlashCommand } from '@some-tools/shared/discord/some-bot/data-access';

import { testRunSubcommandGroup } from './run';

export const testCommand = makeModularSlashCommand({
  builderCallback: (command) =>
    command
      .setName('test')
      .setDescription('Tests.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .setDMPermission(false),
  subcommandGroups: [testRunSubcommandGroup],
});
