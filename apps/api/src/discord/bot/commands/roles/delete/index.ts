import { makeSlashSubcommandGroup } from '@some-tools/shared/discord/some-bot/data-access';

import { deleteManyRoles } from './many';

export const roleDeleteSubcommandGroup = makeSlashSubcommandGroup({
  builderCallback: (group) => group.setName('delete').setDescription('Role delete operations.'),
  subcommands: [deleteManyRoles],
});
