import { makeSlashSubcommandGroup } from '@some-tools/shared/discord/some-bot/data-access';

import { linkOneServerMemberDiscordAccountSubcommand } from './link-discord-account';

export const someUserUpdateSubcommandGroup = makeSlashSubcommandGroup({
  builderCallback: (group) => group.setName('update').setDescription('Some user update operations.'),
  subcommands: [linkOneServerMemberDiscordAccountSubcommand],
});
