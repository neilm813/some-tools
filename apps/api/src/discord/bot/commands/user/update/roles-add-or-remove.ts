import {
  ActionRowBuilder,
  italic,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
} from '@discordjs/builders';
import { TextInputStyle } from 'discord.js';

import { serverMemberUpdateManyChangeRoles } from '@some-tools/shared/api/data-access';
import { isServerMemberRoleUpdateMethod, SERVER_MEMBER_ROLE_UPDATE_METHODS } from '@some-tools/shared/api/types';
import {
  DISCORD_BULK_REQUEST_LIMIT,
  failedResultMessagesWithInputsToCsvAttachment,
  formatResultsStats,
  formatSimpleError,
  getKeyRolesInfo,
  makeDiscordBulkRequestLimitFault,
  makeDiscordInvalidRoleUpdateMethodFault,
  makeModularSlashSubcommand,
  makeOptionsInfo,
  parseEmailRows,
} from '@some-tools/shared/discord/some-bot/data-access';
import { EMOJIS } from '@some-tools/shared/utils/common';
import { isFail } from '@some-tools/shared/utils/try-fail';

const optionsInfo = makeOptionsInfo({
  roleUpdateMethod: true,
  roles: true,
});

const modalIdsInfo = makeOptionsInfo({
  updateManyUsersRolesId: true,
  pastedEmailRows: true,
});

const validRoleUpdateMethods = [SERVER_MEMBER_ROLE_UPDATE_METHODS.add, SERVER_MEMBER_ROLE_UPDATE_METHODS.remove];

const roleChangeChoices = validRoleUpdateMethods.map((methodName) => ({
  name: methodName,
  value: methodName,
}));

export const updateManyUsersRolesAddOrRemoveSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('roles-add-remove')
      .setDescription("Adds or removes roles to many discord user's in the database and in discord.")
      .addStringOption((option) =>
        option
          .setName(optionsInfo.roleUpdateMethod.name)
          .setDescription('The kind of role update to perform.')
          .addChoices(...roleChangeChoices)
          .setRequired(optionsInfo.roleUpdateMethod.required)
      )
      .addStringOption((option) =>
        option
          .setName(optionsInfo.roles.name)
          .setDescription(`The roles to be added or removed.`)
          .setRequired(optionsInfo.roles.required)
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    const { guild, options, member } = interaction;

    const roleUpdateMethod = options.getString(
      optionsInfo.roleUpdateMethod.name,
      optionsInfo.roleUpdateMethod.required
    );
    const rolesToUpdate = options.resolved?.roles;

    const userEmailsTextInput = new TextInputBuilder()
      .setCustomId(modalIdsInfo.pastedEmailRows.name)
      // .setMaxLength(2000)
      .setLabel('Emails on new lines (paste from google sheet)')
      .setPlaceholder('jane.d@gmail.com\njohn.d@gmail.com')
      .setRequired(modalIdsInfo.pastedEmailRows.required)
      .setStyle(TextInputStyle.Paragraph);

    const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(userEmailsTextInput);

    const modal = new ModalBuilder()
      .setCustomId(modalIdsInfo.updateManyUsersRolesId.name)
      .setTitle("Update many user's roles.")
      .addComponents(actionRow);

    await interaction.showModal(modal);

    const modalSubmission = await interaction.awaitModalSubmit({
      filter: (interaction) => interaction.customId === modalIdsInfo.updateManyUsersRolesId.name,
      time: 14000,
    });

    if (!rolesToUpdate || rolesToUpdate.size === 0) {
      return modalSubmission.reply(
        formatSimpleError(`No roles were mentioned in the ${italic(optionsInfo.roles.name)} option.`)
      );
    }

    const emailRowsInput = modalSubmission.fields.getTextInputValue(modalIdsInfo.pastedEmailRows.name);
    const parsedEmails = parseEmailRows(emailRowsInput);

    if (parsedEmails.length === 0) {
      return modalSubmission.reply(formatSimpleError('No emails were received.'));
    }

    if (parsedEmails.length > DISCORD_BULK_REQUEST_LIMIT) {
      return modalSubmission.reply(formatSimpleError(makeDiscordBulkRequestLimitFault().message));
    }

    // This shouldn't happen unless the given choices are mistakenly changed to be invalid.
    if (!isServerMemberRoleUpdateMethod(roleUpdateMethod)) {
      return modalSubmission.reply(
        formatSimpleError(makeDiscordInvalidRoleUpdateMethodFault(roleUpdateMethod, validRoleUpdateMethods).message)
      );
    }

    const keyRolesInfo = getKeyRolesInfo(guild);
    let filteredRolesToUpdate = Array.from(rolesToUpdate.keys());

    // If user running command isn't admin, don't allow them to add or remove admin roles.
    if (!keyRolesInfo.isAdmin(member)) {
      filteredRolesToUpdate = filteredRolesToUpdate.filter((roleId) =>
        keyRolesInfo.isAdminRole(roleId) ? false : true
      );
    }

    await modalSubmission.reply(EMOJIS.hourGlassNotDone);

    const updatedUsersResults = await serverMemberUpdateManyChangeRoles(
      { guildId: guild.id, roleUpdateMethod: roleUpdateMethod },
      { emails: parsedEmails, selectedRoles: filteredRolesToUpdate }
    );

    // The whole api call failed.
    if (isFail(updatedUsersResults)) {
      return modalSubmission.editReply(formatSimpleError(updatedUsersResults.fault.message));
    }

    const { results: updatedUserResults, stats: resultsStats } = updatedUsersResults.value;

    const formattedOutcomeStats = formatResultsStats(resultsStats);

    if (resultsStats.failed > 0) {
      const csvAttachment = await failedResultMessagesWithInputsToCsvAttachment(
        parsedEmails.map((email) => ({ email })),
        updatedUserResults
      );

      return modalSubmission.editReply({
        content: formattedOutcomeStats,
        files: [csvAttachment],
      });
    }

    return modalSubmission.editReply(formattedOutcomeStats);
  },
});
