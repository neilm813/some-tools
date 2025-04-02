import { italic } from 'discord.js';

import { serverMemberCreateOne } from '@some-tools/shared/api/data-access';
import {
  formatSimpleError,
  formatSimpleSuccess,
  getKeyRolesInfo,
  makeModularSlashSubcommand,
  makeOptionsInfo,
} from '@some-tools/shared/discord/some-bot/data-access';
import { DISCORD_JOIN_URL } from '@some-tools/shared/discord/some-bot/environments';
import { isFail } from '@some-tools/shared/utils/try-fail';

const optionsInfo = makeOptionsInfo({
  firstName: true,
  lastName: true,
  email: true,
  stackRole: true,
  cohortRole: false,
});

export const createOneStudentSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('one-student')
      .setDescription(
        'Creates a student in the database allowing them to join our discord and auto-receive initial roles.'
      )
      .addStringOption((option) =>
        option
          .setName(optionsInfo.firstName.name)
          .setDescription('Their first name matching the learn platform.')
          .setRequired(optionsInfo.firstName.required)
      )
      .addStringOption((option) =>
        option
          .setName(optionsInfo.lastName.name)
          .setDescription('Their last name matching the learn platform.')
          .setRequired(optionsInfo.lastName.required)
      )
      .addStringOption((option) =>
        option
          .setName(optionsInfo.email.name)
          .setDescription('Their email matching the learn platform.')
          .setRequired(optionsInfo.email.required)
      )
      .addRoleOption((option) =>
        option
          .setName(optionsInfo.stackRole.name)
          .setDescription('Mention the stack role they will start with or pre-bootcamp if being added early.')
          .setRequired(optionsInfo.stackRole.required)
      )
      .addRoleOption((option) =>
        option
          .setName(optionsInfo.cohortRole.name)
          .setDescription('Mention the assigned cohort role or blank if stack is pre-bootcamp or programming basics.')
          .setRequired(optionsInfo.cohortRole.required)
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    await interaction.deferReply();

    const { guild, options } = interaction;

    const firstName = options.getString(optionsInfo.firstName.name, optionsInfo.firstName.required);
    const lastName = options.getString(optionsInfo.lastName.name, optionsInfo.lastName.required);
    const email = options.getString(optionsInfo.email.name, optionsInfo.email.required);
    const stackRole = options.getRole(optionsInfo.stackRole.name, optionsInfo.stackRole.required);
    const cohortRole = options.getRole(optionsInfo.cohortRole.name, optionsInfo.cohortRole.required);

    const keyRolesInfo = getKeyRolesInfo(guild);

    const isCohortRoleRequired =
      keyRolesInfo.isPreBootcampStackRole(stackRole) === false &&
      keyRolesInfo.isProgrammingBasicsStackRole(stackRole) === false;

    const errorMessages = [];

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
      return interaction.editReply(errorMessages.map((message) => formatSimpleError(message)).join('\n'));
    }

    const roleIds: string[] = [keyRolesInfo.student.id, stackRole.id];
    cohortRole !== null && roleIds.push(cohortRole.id);

    const newServerMemberResult = await serverMemberCreateOne(
      { guildId: guild.id },
      {
        firstName,
        lastName,
        email,
        roles: roleIds,
      }
    );

    if (isFail(newServerMemberResult)) {
      return interaction.editReply(formatSimpleError(newServerMemberResult.fault.message));
    }

    await interaction.editReply(
      formatSimpleSuccess(`${newServerMemberResult.value.email} can now be sent the join link: ${DISCORD_JOIN_URL}`)
    );
  },
});
