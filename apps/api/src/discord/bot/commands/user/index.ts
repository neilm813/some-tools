import { PermissionFlagsBits } from 'discord.js';

import { makeModularSlashCommand } from '@some-tools/shared/discord/some-bot/data-access';

import { userCreateSubcommandGroup } from './create';
import { userDeleteSubcommandGroup } from './delete';
import { userFindSubcommandGroup } from './find';
import { userUpdateSubcommandGroup } from './update';

export const userCommand = makeModularSlashCommand({
  builderCallback: (command) =>
    command
      .setName('user')
      .setDescription('User management commands.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog)
      .setDMPermission(false),
  subcommandGroups: [
    userFindSubcommandGroup,
    userCreateSubcommandGroup,
    userUpdateSubcommandGroup,
    userDeleteSubcommandGroup,
  ],
});
