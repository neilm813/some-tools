import { makeModularSlashCommand } from '@some-tools/shared/discord/some-bot/data-access';

import { someUserUpdateSubcommandGroup } from './update';

export const someUserCommand = makeModularSlashCommand({
  builderCallback: (command) =>
    command
      .setName('some-user')
      .setDescription('Commands for some users to manage their account.')
      .setDMPermission(true),
  subcommandGroups: [someUserUpdateSubcommandGroup],
});
