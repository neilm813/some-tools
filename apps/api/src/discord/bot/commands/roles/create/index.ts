import { makeSlashSubcommandGroup } from '@some-tools/shared/discord/some-bot/data-access';

import { createCohortRole } from './cohort-role';

export const roleCreateSubcommandGroup = makeSlashSubcommandGroup({
  builderCallback: (group) => group.setName('create').setDescription('Role create operations.'),
  subcommands: [createCohortRole],
});
