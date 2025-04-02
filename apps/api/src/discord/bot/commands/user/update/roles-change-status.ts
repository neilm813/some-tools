import {
  ActionRowBuilder,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
} from '@discordjs/builders';
import { TextInputStyle } from 'discord.js';

import { serverMemberUpdateManyChangeRoles } from '@some-tools/shared/api/data-access';
import { isServerMemberRoleUpdateMethod, SERVER_MEMBER_ROLE_UPDATE_METHODS } from '@some-tools/shared/api/types';
import {
  failedResultMessagesWithInputsToCsvAttachment,
  formatResultsStats,
  formatSimpleError,
  makeDiscordBulkRequestLimitFault,
  makeDiscordInvalidRoleUpdateMethodFault,
  makeModularSlashSubcommand,
  makeOptionsInfo,
} from '@some-tools/shared/discord/some-bot/data-access';
import { DISCORD_BULK_REQUEST_LIMIT, parseEmailRows } from '@some-tools/shared/discord/some-bot/data-access';
import { EMOJIS } from '@some-tools/shared/utils/common';
import { isFail } from '@some-tools/shared/utils/try-fail';

const modalIdsInfo = makeOptionsInfo({
  updateManyUsersRolesId: true,
  pastedEmailRows: true,
});

const optionsInfo = makeOptionsInfo({
  roleUpdateMethod: true,
});

const validRoleUpdateMethods = [
  SERVER_MEMBER_ROLE_UPDATE_METHODS['to-alumni'],
  SERVER_MEMBER_ROLE_UPDATE_METHODS.postpone,
];

const roleChangeChoices = validRoleUpdateMethods.map((methodName) => ({
  name: methodName,
  value: methodName,
}));

export const updateManyUsersRolesChangeStatusSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('roles-change-status')
      .setDescription('Changes roles to update status to alumni or postponed.')
      .addStringOption((option) =>
        option
          .setName(optionsInfo.roleUpdateMethod.name)
          .setDescription('The kind of role update to perform.')
          .addChoices(...roleChangeChoices)
          .setRequired(optionsInfo.roleUpdateMethod.required)
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    const { guild, options } = interaction;

    const roleUpdateMethod = options.getString(
      optionsInfo.roleUpdateMethod.name,
      optionsInfo.roleUpdateMethod.required
    );

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
      time: 45000,
    });

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

    await modalSubmission.reply(EMOJIS.hourGlassNotDone);

    const updatedUsersResults = await serverMemberUpdateManyChangeRoles(
      { guildId: guild.id, roleUpdateMethod },
      { emails: parsedEmails, selectedRoles: [] }
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
