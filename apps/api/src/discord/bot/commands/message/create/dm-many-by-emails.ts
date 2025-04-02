import {
  ActionRowBuilder,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
} from '@discordjs/builders';
import { TextInputStyle } from 'discord.js';

import { serverMemberLinkedGuildMemberDMMany } from '@some-tools/shared/api/data-access';
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
  dmManyUsers: true,
  pastedEmailRows: true,
  messageToSend: true,
});

export const sendDMToManyLinkedGuildMembersSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('direct-message-many-by-emails')
      .setDescription(
        'Sends a message to many discord accounts if found in this guild and linked to the given emails.'
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    const { guild } = interaction;

    const userEmailsTextInput = new TextInputBuilder()
      .setCustomId(modalIdsInfo.pastedEmailRows.name)
      .setLabel('Emails on new lines (paste from google sheet)')
      .setPlaceholder('jane.d@gmail.com\njohn.d@gmail.com')
      .setRequired(modalIdsInfo.pastedEmailRows.required)
      .setStyle(TextInputStyle.Paragraph);

    const messageToSendTextInput = new TextInputBuilder()
      .setCustomId(modalIdsInfo.messageToSend.name)
      .setLabel('Message to send.')
      .setPlaceholder('Hello world.')
      .setRequired(modalIdsInfo.messageToSend.required)
      .setStyle(TextInputStyle.Paragraph);

    const emailsActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(userEmailsTextInput);

    const messageToSendActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      messageToSendTextInput
    );

    const modal = new ModalBuilder()
      .setCustomId(modalIdsInfo.dmManyUsers.name)
      .setTitle('Direct message many linked discord accounts.')
      .addComponents(emailsActionRow, messageToSendActionRow);

    await interaction.showModal(modal);

    const modalSubmission = await interaction.awaitModalSubmit({
      filter: (interaction) => interaction.customId === modalIdsInfo.dmManyUsers.name,
      time: 120000,
    });

    const emailRowsInput = modalSubmission.fields.getTextInputValue(modalIdsInfo.pastedEmailRows.name);
    const messageToSendInput = modalSubmission.fields.getTextInputValue(modalIdsInfo.messageToSend.name);
    const parsedEmails = parseEmailRows(emailRowsInput);

    if (parsedEmails.length === 0) {
      return modalSubmission.reply(formatSimpleError('No emails were received.'));
    }

    if (parsedEmails.length > DISCORD_BULK_REQUEST_LIMIT) {
      return modalSubmission.reply(formatSimpleError(makeDiscordBulkRequestLimitFault().message));
    }

    await modalSubmission.reply(EMOJIS.hourGlassNotDone);

    const result = await serverMemberLinkedGuildMemberDMMany(
      { guildId: guild.id },
      { emails: parsedEmails, message: messageToSendInput, authorId: interaction.member.id }
    );

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
