import { CategoryChannel, ChannelType, PermissionFlagsBits, TextChannel } from 'discord.js';

import {
  formatSimpleError,
  formatSimpleSuccess,
  getKeyRolesInfo,
  makeModularSlashSubcommand,
  makeOptionsInfo,
} from '@some-tools/shared/discord/some-bot/data-access';

const optionsInfo = makeOptionsInfo({
  hyphenatedNewChannelName: true,
  targetChannelCategory: true,
  cohortRole: true,
  oldChannelToDelete: false,
});

export const createCohortSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('cohort')
      .setDescription('Creates a new cohort channel with the proper permissions & optionally deletes the old channel.')
      .addStringOption((option) =>
        option
          .setName(optionsInfo.hyphenatedNewChannelName.name)
          .setDescription(`The name of the new cohort channel delimited by hyphens, e.g., neil-m.`)
          .setRequired(optionsInfo.hyphenatedNewChannelName.required)
      )
      .addChannelOption((option) =>
        option
          .setName(optionsInfo.targetChannelCategory.name)
          .setDescription(
            'The stack / program category the new channel should be created under: #category-name (folder icon).'
          )
          .addChannelTypes(ChannelType.GuildCategory)
          .setRequired(optionsInfo.targetChannelCategory.required)
      )
      .addRoleOption((option) =>
        option
          .setName(optionsInfo.cohortRole.name)
          .setDescription('Use @ to mention the cohort role that needs access to the new cohort channel.')
          .setRequired(optionsInfo.cohortRole.required)
      )
      .addChannelOption((option) =>
        option
          .setName(optionsInfo.oldChannelToDelete.name)
          .addChannelTypes(ChannelType.GuildText)
          .setDescription("Mention the old cohort channel to delete it if it's unused.")
          .setRequired(optionsInfo.oldChannelToDelete.required)
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    const { guild, options } = interaction;
    const newChannelName = options.getString(
      optionsInfo.hyphenatedNewChannelName.name,
      optionsInfo.hyphenatedNewChannelName.required
    );
    const targetChannelCategory = options.getChannel(
      optionsInfo.targetChannelCategory.name,
      optionsInfo.targetChannelCategory.required
    );
    const cohortRole = options.getRole(optionsInfo.cohortRole.name, optionsInfo.cohortRole.required);
    const oldChannelToDelete = options.getChannel(
      optionsInfo.oldChannelToDelete.name,
      optionsInfo.oldChannelToDelete.required
    );

    const keyRoles = getKeyRolesInfo(guild);

    if (!(targetChannelCategory instanceof CategoryChannel)) {
      return await interaction.reply(
        formatSimpleError(
          `The option ${optionsInfo.targetChannelCategory.name} must be a Channel Category (look for a folder icon when selecting).`
        )
      );
    }

    if (keyRoles.isCohortRole(cohortRole) === false) {
      return await interaction.reply(
        formatSimpleError(`The option ${optionsInfo.cohortRole.name} must start with ${keyRoles.prefixes.cohort}`)
      );
    }

    // Delete the mentioned old channel only if it's a cohort channel
    if (
      oldChannelToDelete &&
      oldChannelToDelete instanceof TextChannel &&
      // TODO: switch this to keyChannels.isCohort(...)
      oldChannelToDelete.name.includes(keyRoles.prefixes.cohort)
    ) {
      oldChannelToDelete.deletable && oldChannelToDelete.delete();
    }

    const newChannel = await guild.channels.create({
      name: `${keyRoles.prefixes.cohort}${newChannelName.replace(keyRoles.prefixes.cohort, '')}`,
      type: ChannelType.GuildText,
      parent: targetChannelCategory,
      permissionOverwrites: [
        ...targetChannelCategory.permissionOverwrites.cache.values(),
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: cohortRole.id,
          allow: [PermissionFlagsBits.ViewChannel],
        },
      ],
    });

    await interaction.reply(formatSimpleSuccess(`${newChannel}`));
  },
});
