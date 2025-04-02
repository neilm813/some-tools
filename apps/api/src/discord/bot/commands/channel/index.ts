import { PermissionFlagsBits } from 'discord.js';

import { makeModularSlashCommand } from '@some-tools/shared/discord/some-bot/data-access';

import { channelCreateSubcommandGroup } from './create';

export const channelCommand = makeModularSlashCommand({
  builderCallback: (command) =>
    command
      .setName('channel')
      .setDescription('Channel management commands.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog)
      .setDMPermission(false),
  subcommandGroups: [channelCreateSubcommandGroup],
});
