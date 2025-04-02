import {
  ActionRowBuilder,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
} from '@discordjs/builders';
import { TextInputStyle } from 'discord.js';

import {
  SERVER_MEMBER_ROLE_UPDATE_METHODS,
  serverMemberUpdateManyChangeRoles,
} from '@some-tools/shared/api/data-access';
import {
  DISCORD_BULK_REQUEST_LIMIT,
  failedResultMessagesWithInputsToCsvAttachment,
  formatResultsStats,
  formatSimpleError,
  getKeyRolesInfo,
  makeDiscordBulkRequestLimitFault,
  makeModularSlashSubcommand,
  makeOptionsInfo,
  parseEmailRows,
} from '@some-tools/shared/discord/some-bot/data-access';
import { EMOJIS } from '@some-tools/shared/utils/common';
import { isFail } from '@some-tools/shared/utils/try-fail';

const optionsInfo = makeOptionsInfo({
  programRegion: true,
  newCohortRole: true,
  newStackRole: true,
});

const modalIdsInfo = makeOptionsInfo({
  updateManyUsersRolesId: true,
  pastedEmailRows: true,
});

/*
Removing the domestic or international selection, may add it back later.

It may be better to not use for now since it's currently only used to make the stack role optional, but since the
stack role is required for domestic, it's confusing that the option is not required and then people run the command
as domestic and find out the stack role actually is required.

! If it's added back the back-end logic needs to be updated so that if no stack role is provided the stack role is not
removed.
*/

// const programRegionChoices = {
//   domestic: 'domestic',
//   international: 'international',
// };

export const updateManyUsersRolesChangeCohortSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('roles-change-cohort')
      .setDescription('Replaces current stack and cohort roles with the given ones.')
      // .addStringOption((option) =>
      //   option
      //     .setName(optionsInfo.programRegion.name)
      //     .setRequired(optionsInfo.programRegion.required)
      //     .setDescription('The region of the program the students are in.')
      //     .addChoices(...Object.values(programRegionChoices).map((value) => ({ name: value, value })))
      // )
      .addRoleOption((option) =>
        option
          .setName(optionsInfo.newCohortRole.name)
          .setRequired(optionsInfo.newCohortRole.required)
          .setDescription('The new cohort role.')
      )
      .addRoleOption((option) =>
        option
          .setName(optionsInfo.newStackRole.name)
          .setRequired(optionsInfo.newStackRole.required)
          .setDescription('The new stack role. If international, use stack-international.')
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    const { guild, options } = interaction;

    // const programRegion = options.getString(optionsInfo.programRegion.name, optionsInfo.programRegion.required);
    const newCohortRole = options.getRole(optionsInfo.newCohortRole.name, optionsInfo.newCohortRole.required);
    const newStackRole = options.getRole(optionsInfo.newStackRole.name, optionsInfo.newStackRole.required);

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

    const keyRolesInfo = getKeyRolesInfo(guild);

    const validationErrors: string[] = [];

    if (!keyRolesInfo.isCohortRole(newCohortRole)) {
      validationErrors.push(keyRolesInfo.errors.cohortFormat);
    }

    if (!keyRolesInfo.isStackRole(newStackRole)) {
      validationErrors.push(keyRolesInfo.errors.stackFormat);
    }

    // if (programRegion === programRegionChoices.domestic) {
    //   if (newStackRole) {
    //     if (!keyRolesInfo.isStackRole(newStackRole)) {
    //       validationErrors.push(keyRolesInfo.errors.stackFormat);
    //     }
    //   } else {
    //     validationErrors.push(`A stack role is required for ${programRegionChoices.domestic} programs.`);
    //   }
    // }

    if (validationErrors.length > 0) {
      return modalSubmission.reply(validationErrors.map((message) => formatSimpleError(message)).join('\n'));
    }

    await modalSubmission.reply(EMOJIS.hourGlassNotDone);

    const updatedUsersResults = await serverMemberUpdateManyChangeRoles(
      { guildId: guild.id, roleUpdateMethod: SERVER_MEMBER_ROLE_UPDATE_METHODS['change-cohort'] },
      { emails: parsedEmails, selectedRoles: [newCohortRole.id].concat(newStackRole ? newStackRole.id : []) }
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
