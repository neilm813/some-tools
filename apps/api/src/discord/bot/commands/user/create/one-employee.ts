import { Collection, Role } from 'discord.js';

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
  roles: true,
});

export const createOneEmployeeSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('one-employee')
      .setDescription(
        'Creates a employee in the database allowing them to join our discord and auto-receive initial roles.'
      )
      .addStringOption((option) =>
        option
          .setName(optionsInfo.firstName.name)
          .setDescription('First name.')
          .setRequired(optionsInfo.firstName.required)
      )
      .addStringOption((option) =>
        option
          .setName(optionsInfo.lastName.name)
          .setDescription('Last name.')
          .setRequired(optionsInfo.lastName.required)
      )
      .addStringOption((option) =>
        option
          .setName(optionsInfo.email.name)
          .setDescription('Coding some email / work email.')
          .setRequired(optionsInfo.email.required)
      )
      .addStringOption((option) =>
        option
          .setName(optionsInfo.roles.name)
          .setDescription(
            '@Instructor, @Teacher-Assistant, @QA, @internal-stack-, @cohort-, @Employee (if only role needed).'
          )
          .setRequired(optionsInfo.roles.required)
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    await interaction.deferReply();

    const { guild, options } = interaction;

    const firstName = options.getString(optionsInfo.firstName.name, optionsInfo.firstName.required);
    const lastName = options.getString(optionsInfo.lastName.name, optionsInfo.lastName.required);
    const email = options.getString(optionsInfo.email.name, optionsInfo.email.required);

    const keyRolesInfo = getKeyRolesInfo(guild);
    const mentionedRoleIds =
      options?.resolved?.roles === undefined ? new Collection<string, Role>() : options.resolved.roles;
    const roleIds = Array.from(options.resolved?.roles?.keys() || []);
    const wasEmployeeRoleMentioned = mentionedRoleIds.has(keyRolesInfo.employee.id);
    const wasInstructorRoleMentioned = mentionedRoleIds.has(keyRolesInfo.instructor.id);

    if (!wasEmployeeRoleMentioned) {
      roleIds.push(keyRolesInfo.employee.id);
    }

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

    const createInstructorCohortRoleReminder = `\nNew instructors may need to have a cohort role created and given to them via the create cohort-role command and the user update roles-add commands.`;

    await interaction.editReply(
      formatSimpleSuccess(
        `${newServerMemberResult.value.email} can now be sent the join link: ${DISCORD_JOIN_URL}${
          wasInstructorRoleMentioned ? createInstructorCohortRoleReminder : ''
        }`
      )
    );
  },
});
