import {
  ActionRowBuilder,
  italic,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
} from '@discordjs/builders';
import { bold, TextInputStyle } from 'discord.js';

import { serverMemberCreateMany } from '@some-tools/shared/api/data-access';
import {
  failedResultMessagesWithInputsToCsvAttachment,
  formatResultsStats,
  formatSimpleError,
  getKeyRolesInfo,
  makeModularSlashSubcommand,
  makeOptionsInfo,
  parsePastedUserRows,
} from '@some-tools/shared/discord/some-bot/data-access';
import { isFail } from '@some-tools/shared/utils/try-fail';

const optionsInfo = makeOptionsInfo({
  stackRole: true,
  cohortRole: false,
});

const modalIdsInfo = makeOptionsInfo({
  createManyStudentsModal: true,
  pastedStudentRows: true,
});

export const createManyStudentsSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('many-students')
      .setDescription(
        'Adds many students to the database allowing them to join our discord and auto-receive initial roles.'
      )
      .addRoleOption((option) =>
        option
          .setName(optionsInfo.stackRole.name)
          .setDescription(
            'The role for the stack/program they are starting in. If international, use stack-international.'
          )
          .setRequired(optionsInfo.stackRole.required)
      )
      .addRoleOption((option) =>
        option
          .setName(optionsInfo.cohortRole.name)
          .setDescription('The role for the cohort they are starting in or the prebootcamp cohort role.')
          .setRequired(optionsInfo.cohortRole.required)
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    const { guild, options } = interaction;

    const stackRole = options.getRole(optionsInfo.stackRole.name, optionsInfo.stackRole.required);
    const cohortRole = options.getRole(optionsInfo.cohortRole.name, optionsInfo.cohortRole.required);

    const newStudentRowsTextInput = new TextInputBuilder()
      .setCustomId(modalIdsInfo.pastedStudentRows.name)
      // .setMaxLength(2000)
      .setLabel('Paste student data rows from google sheets.')
      .setPlaceholder('John    Doe    j.d@gmail.com\nJane    Doe    jane.doe@gmail.com')
      .setRequired(modalIdsInfo.pastedStudentRows.required)
      .setStyle(TextInputStyle.Paragraph);

    const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(newStudentRowsTextInput);

    const modal = new ModalBuilder()
      .setCustomId(modalIdsInfo.createManyStudentsModal.name)
      .setTitle('Add many new students to the database.')
      .addComponents(actionRow);

    await interaction.showModal(modal);

    const modalSubmission = await interaction.awaitModalSubmit({
      filter: (interaction) => interaction.customId === modalIdsInfo.createManyStudentsModal.name,
      time: 45000,
    });

    const keyRolesInfo = getKeyRolesInfo(guild);
    const errorMessages = [];

    const isCohortRoleRequired =
      keyRolesInfo.isPreBootcampStackRole(stackRole) === false &&
      keyRolesInfo.isProgrammingBasicsStackRole(stackRole) === false;

    if (keyRolesInfo.isStackRole(stackRole) === false) {
      errorMessages.push(keyRolesInfo.errors.stackFormat);
    }

    if (isCohortRoleRequired) {
      if (cohortRole === null) {
        errorMessages.push(
          `The option ${italic(optionsInfo.cohortRole.name)} is required if the ${italic(
            optionsInfo.stackRole.name
          )} option isn't prebootcamp or programming basics.`
        );
      } else if (keyRolesInfo.isCohortRole(cohortRole) === false) {
        errorMessages.push(keyRolesInfo.errors.cohortFormat);
      }
    }

    if (errorMessages.length) {
      return await modalSubmission.reply(errorMessages.map((message) => formatSimpleError(message)).join('\n'));
    }

    const userRows = modalSubmission.fields.getTextInputValue(modalIdsInfo.pastedStudentRows.name);

    if (userRows.includes('\t') === false) {
      return await modalSubmission.reply(
        formatSimpleError(
          `No tab characters found. ${bold(
            'Rows must be pasted from google sheets'
          )} which will paste columns as tab-separated. To add one at a time without pasting, use the create one command.`
        )
      );
    }

    const roleIds: string[] = [keyRolesInfo.student.id, stackRole.id];
    cohortRole !== null && roleIds.push(cohortRole.id);

    const newUserPayloads = parsePastedUserRows(userRows, roleIds);
    const newUsersResult = await serverMemberCreateMany({ guildId: guild.id }, newUserPayloads);

    // The whole api call failed.
    if (isFail(newUsersResult)) {
      return await modalSubmission.reply(formatSimpleError(newUsersResult.fault.message));
    }

    const { results: newUserResults, stats: resultsStats } = newUsersResult.value;

    const formattedOutcomeStats = formatResultsStats(
      resultsStats,
      resultsStats.failed > 0
        ? 'Use the change-cohort command on any emails with a unique email error.\nFor other errors, resubmit with corrected data.'
        : ''
    );

    if (resultsStats.failed > 0) {
      const csvAttachment = await failedResultMessagesWithInputsToCsvAttachment(
        newUserPayloads.map(({ firstName, lastName, email }) => ({ firstName, lastName, email })),
        newUserResults
      );

      return await modalSubmission.reply({
        content: formattedOutcomeStats,
        files: [csvAttachment],
      });
    }

    return await modalSubmission.reply(formattedOutcomeStats);
  },
});
