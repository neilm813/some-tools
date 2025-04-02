import { PermissionFlagsBits } from 'discord.js';

import { makeModularSlashCommand } from '@some-tools/shared/discord/some-bot/data-access';

import { roleCreateSubcommandGroup } from './create';
import { roleDeleteSubcommandGroup } from './delete';

export const rolesCommand = makeModularSlashCommand({
  builderCallback: (command) =>
    command
      .setName('role')
      .setDescription('Role management commands.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog)
      .setDMPermission(false),
  subcommandGroups: [roleDeleteSubcommandGroup, roleCreateSubcommandGroup],
});
