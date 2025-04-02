import { makeSlashSubcommandGroup } from '@some-tools/shared/discord/some-bot/data-access';

import { banOrUnbanOneSubcommand } from './ban-or-unban-one';
import { kickManyUsersSubcommand } from './kick-many';
import { linkOneServerMemberDiscordAccountSubcommand } from './link-discord-account';
import { updateByIdentifierSubcommand } from './one';
import { updateManyUsersRolesAddOrRemoveSubcommand } from './roles-add-or-remove';
import { updateManyUsersRolesChangeCohortSubcommand } from './roles-change-cohort';
import { updateManyUsersRolesChangeStatusSubcommand } from './roles-change-status';
import { syncLinkedDiscordAccountSubcommand } from './sync-linked-discord-account';
import { unlinkOneServerMemberDiscordAccountSubcommand } from './unlink-discord-account';

export const userUpdateSubcommandGroup = makeSlashSubcommandGroup({
  builderCallback: (group) => group.setName('update').setDescription('Updates user information.'),
  subcommands: [
    updateByIdentifierSubcommand,
    updateManyUsersRolesAddOrRemoveSubcommand,
    updateManyUsersRolesChangeStatusSubcommand,
    updateManyUsersRolesChangeCohortSubcommand,
    linkOneServerMemberDiscordAccountSubcommand,
    syncLinkedDiscordAccountSubcommand,
    unlinkOneServerMemberDiscordAccountSubcommand,
    kickManyUsersSubcommand,
    banOrUnbanOneSubcommand,
  ],
});
