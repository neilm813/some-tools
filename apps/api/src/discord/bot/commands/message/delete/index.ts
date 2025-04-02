import { makeSlashSubcommandGroup } from '@some-tools/shared/discord/some-bot/data-access';

import { deleteBulkSubcommand } from './bulk';

export const messageDeleteSubcommandGroup = makeSlashSubcommandGroup({
  builderCallback: (group) => group.setName('delete').setDescription('Message delete operations.'),
  subcommands: [deleteBulkSubcommand],
});
