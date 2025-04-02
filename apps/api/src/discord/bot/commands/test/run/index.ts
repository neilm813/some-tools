import { makeSlashSubcommandGroup } from '@some-tools/shared/discord/some-bot/data-access';

import { runSomethingSubcommand } from './something';

export const testRunSubcommandGroup = makeSlashSubcommandGroup({
  builderCallback: (group) => group.setName('run').setDescription('Tests.'),
  subcommands: [runSomethingSubcommand],
});
