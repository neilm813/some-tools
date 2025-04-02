import { makeSlashSubcommandGroup } from '@some-tools/shared/discord/some-bot/data-access';

import { findManyUsersByEmailsSubcommand } from './many-by-emails';
import { findManyUsersByRolesSubcommand } from './many-by-roles';
import { findByIdentifierSubcommand } from './one';

export const userFindSubcommandGroup = makeSlashSubcommandGroup({
  builderCallback: (group) => group.setName('find').setDescription('Finds user information.'),
  subcommands: [findByIdentifierSubcommand, findManyUsersByEmailsSubcommand, findManyUsersByRolesSubcommand],
});
