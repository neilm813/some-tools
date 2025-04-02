import {
  ActionRowBuilder,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
} from '@discordjs/builders';
import { AttachmentBuilder, TextInputStyle } from 'discord.js';
import { writeToBuffer } from 'fast-csv';

import { manyServerMemberResultsToCsvRows, serverMemberFindMany } from '@some-tools/shared/api/data-access';
import {
  formatSimpleError,
  makeModularSlashSubcommand,
  makeOptionsInfo,
  parseEmailRows,
} from '@some-tools/shared/discord/some-bot/data-access';
import { isFail } from '@some-tools/shared/utils/try-fail';

const modalIdsInfo = makeOptionsInfo({
  findManyUsers: true,
  pastedEmailRows: true,
});

export const findManyUsersByEmailsSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) => subcommand.setName('many-by-emails').setDescription('Finds many users by emails.'),
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
      .setCustomId(modalIdsInfo.findManyUsers.name)
      .setTitle('Find many users by emails.')
      .addComponents(actionRow);

    await interaction.showModal(modal);

    const modalSubmission = await interaction.awaitModalSubmit({
      filter: (interaction) => interaction.customId === modalIdsInfo.findManyUsers.name,
      time: 14000,
    });

    const emailRowsInput = modalSubmission.fields.getTextInputValue(modalIdsInfo.pastedEmailRows.name);
    const parsedEmails = parseEmailRows(emailRowsInput);

    if (parsedEmails.length === 0) {
      return modalSubmission.reply(formatSimpleError('No emails were received.'));
    }

    const result = await serverMemberFindMany({ guildId: guild.id }, { emails: parsedEmails });

    // The whole api call failed.
    if (isFail(result)) {
      return modalSubmission.reply(formatSimpleError(result.fault.message));
    }

    const results = result.value;
    const csvRows = manyServerMemberResultsToCsvRows(results, parsedEmails);
    const csvAttachment = new AttachmentBuilder(await writeToBuffer(csvRows, { headers: true }), {
      name: 'discord-users.csv',
    });

    return modalSubmission.reply({
      files: [csvAttachment],
    });
  },
});
