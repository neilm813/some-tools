import { PermissionFlagsBits } from 'discord.js';

import { makeModularSlashCommand } from '@some-tools/shared/discord/some-bot/data-access';

import { messageCreateSubcommandGroup } from './create';
import { messageDeleteSubcommandGroup } from './delete';

export const messageCommand = makeModularSlashCommand({
  builderCallback: (command) =>
    command
      .setName('message')
      .setDescription('Message management commands.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog)
      .setDMPermission(false),
  subcommandGroups: [messageCreateSubcommandGroup, messageDeleteSubcommandGroup],
});
