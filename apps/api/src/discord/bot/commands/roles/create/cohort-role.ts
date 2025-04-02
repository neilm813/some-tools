import { Colors, PermissionsBitField } from 'discord.js';

import {
  formatSimpleError,
  formatSimpleSuccess,
  getKeyRolesInfo,
  makeModularSlashSubcommand,
  makeOptionsInfo,
} from '@some-tools/shared/discord/some-bot/data-access';
import { makeUnidentifiedFault } from '@some-tools/shared/utils/common';
import { isFail, tryFailAsync } from '@some-tools/shared/utils/try-fail';

const optionsInfo = makeOptionsInfo({
  cohortName: true,
});

export const createCohortRole = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('cohort-role')
      .setDescription('Creates a role for new cohort.')
      .addStringOption((option) =>
        option
          .setName(optionsInfo.cohortName.name)
          .setDescription('Typically named: FirstNameLastInitial.')
          .setRequired(optionsInfo.cohortName.required)
      ),

  runChatInputCommandInCachedGuild: async (interaction) => {
    const { options, guild, member } = interaction;
    const cohortName = options.getString(optionsInfo.cohortName.name, optionsInfo.cohortName.required);

    if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: formatSimpleError(`${member} does not have permission to manage roles.`) });
    }

    const keyRoles = getKeyRolesInfo(guild);

    const roleResult = await tryFailAsync(async () => {
      return guild.roles.create({
        name: keyRoles.prefixes.cohort + cohortName.toLowerCase().replace(keyRoles.prefixes.cohort, ''),
        color: Colors.Red,
        reason: 'Setting up a new cohort for specified instructor.',
        mentionable: true,
      });
    }, makeUnidentifiedFault);

    if (isFail(roleResult)) {
      return interaction.reply({ content: formatSimpleError(roleResult.fault.message) });
    }

    return interaction.reply(formatSimpleSuccess(`New role: ${roleResult.value}`));
  },
});
