import { AttachmentBuilder } from 'discord.js';
import { writeToBuffer } from 'fast-csv';

import { manyServerMemberResultsToCsvRows, serverMemberFindMany } from '@some-tools/shared/api/data-access';
import {
  formatSimpleError,
  makeModularSlashSubcommand,
  makeOptionsInfo,
} from '@some-tools/shared/discord/some-bot/data-access';
import { isFail } from '@some-tools/shared/utils/try-fail';

const optionsInfo = makeOptionsInfo({
  mustHaveRoles: true,
});

export const findManyUsersByRolesSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('many-by-roles')
      .setDescription('Finds many users that have all of the mentioned roles.')
      .addStringOption((option) =>
        option
          .setName(optionsInfo.mustHaveRoles.name)
          .setRequired(optionsInfo.mustHaveRoles.required)
          .setDescription('Mention one or more roles that the user must have to be found.')
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    const {
      guild,
      options: { resolved },
    } = interaction;

    if (!resolved?.roles || resolved.roles.size === 0) {
      return interaction.reply(formatSimpleError('At least one role must be mentioned.'));
    }

    const result = await serverMemberFindMany({ guildId: guild.id }, { roles: Array.from(resolved.roles.keys()) });

    // The whole api call failed.
    if (isFail(result)) {
      return interaction.reply(formatSimpleError(result.fault.message));
    }

    const results = result.value;

    if (results.length === 0) {
      return interaction.reply(formatSimpleError('None found.'));
    }

    const csvRows = manyServerMemberResultsToCsvRows(results);
    const csvAttachment = new AttachmentBuilder(await writeToBuffer(csvRows, { headers: true }), {
      name: 'discord-users.csv',
    });

    return interaction.reply({
      files: [csvAttachment],
    });
  },
});
