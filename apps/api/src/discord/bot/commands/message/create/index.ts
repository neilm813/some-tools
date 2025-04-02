import { makeSlashSubcommandGroup } from '@some-tools/shared/discord/some-bot/data-access';

import { sendDMToManyLinkedGuildMembersSubcommand } from './dm-many-by-emails';
import { sendToEachChannelSubcommand } from './send-to-each-channel';

export const messageCreateSubcommandGroup = makeSlashSubcommandGroup({
  builderCallback: (group) => group.setName('create').setDescription('Message create operations.'),
  subcommands: [sendToEachChannelSubcommand, sendDMToManyLinkedGuildMembersSubcommand],
});
