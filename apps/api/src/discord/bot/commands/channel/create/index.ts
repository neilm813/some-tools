import { makeSlashSubcommandGroup } from '@some-tools/shared/discord/some-bot/data-access';

import { createCohortSubcommand } from './cohort';
import { createProgramCategorySubcommand } from './program-category';

export const channelCreateSubcommandGroup = makeSlashSubcommandGroup({
  builderCallback: (group) => group.setName('create').setDescription('Channel create commands.'),
  subcommands: [createCohortSubcommand, createProgramCategorySubcommand],
});
