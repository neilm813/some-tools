import {
  ActionRowBuilder,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
} from '@discordjs/builders';
import { TextInputStyle } from 'discord.js';

import { serverMemberKickManyLinkedDiscordAccounts } from '@some-tools/shared/api/data-access';
import {
  DISCORD_BULK_REQUEST_LIMIT,
  failedResultMessagesWithInputsToCsvAttachment,
  formatResultsStats,
  formatSimpleError,
  makeDiscordBulkRequestLimitFault,
  makeModularSlashSubcommand,
  makeOptionsInfo,
  parseEmailRows,
} from '@some-tools/shared/discord/some-bot/data-access';
import { EMOJIS } from '@some-tools/shared/utils/common';
import { isFail } from '@some-tools/shared/utils/try-fail';

const modalIdsInfo = makeOptionsInfo({
  updateManyUsersRolesId: true,
  pastedEmailRows: true,
});

export const kickManyUsersSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('kick-many')
      .setDescription("Kicks the linked discord accounts if they are found in the server and aren't already banned."),
  runChatInputCommandInCachedGuild: async (interaction) => {
    const { guild } = interaction;

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
      .setTitle('Kick linked discord accounts.')
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

    await modalSubmission.reply(EMOJIS.hourGlassNotDone);

    const result = await serverMemberKickManyLinkedDiscordAccounts({ guildId: guild.id }, { emails: parsedEmails });

    // The whole api call failed.
    if (isFail(result)) {
      return modalSubmission.editReply(formatSimpleError(result.fault.message));
    }

    const { results, stats: resultsStats } = result.value;

    const formattedOutcomeStats = formatResultsStats(resultsStats);

    if (resultsStats.failed > 0) {
      const csvAttachment = await failedResultMessagesWithInputsToCsvAttachment(
        parsedEmails.map((email) => ({ email })),
        results
      );

      return modalSubmission.editReply({
        content: formattedOutcomeStats,
        files: [csvAttachment],
      });
    }

    return modalSubmission.editReply(formattedOutcomeStats);
  },
});
