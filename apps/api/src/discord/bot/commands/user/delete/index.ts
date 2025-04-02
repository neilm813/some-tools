import { makeSlashSubcommandGroup } from '@some-tools/shared/discord/some-bot/data-access';

import { deleteByEmailSubcommand } from './one';

export const userDeleteSubcommandGroup = makeSlashSubcommandGroup({
  // 'Delete' with a capital D is a reserved word that cannot be used for slash command names.
  builderCallback: (group) => group.setName('delete').setDescription('User delete commands.'),
  subcommands: [deleteByEmailSubcommand],
});
