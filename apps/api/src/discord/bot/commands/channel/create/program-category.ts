import { ChannelType, italic, PermissionFlagsBits } from 'discord.js';

import {
  formatSimpleError,
  formatSimpleSuccess,
  getKeyRolesInfo,
  makeModularSlashSubcommand,
  makeOptionsInfo,
} from '@some-tools/shared/discord/some-bot/data-access';

const optionsInfo = makeOptionsInfo({
  domesticOrInternational: true,
  internalRole: true,
  hyphenatedNewCategoryName: true,
});

export const createProgramCategorySubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('program-category')
      .setDescription('Creates a new category for a program.')
      .addStringOption((option) =>
        option
          .setName(optionsInfo.domesticOrInternational.name)
          .setDescription('Whether the category is for the domestic or international program.')
          .setRequired(optionsInfo.domesticOrInternational.required)
          .addChoices({ name: 'Domestic', value: 'domestic' }, { name: 'International', value: 'international' })
      )
      .addStringOption((option) =>
        option
          .setName(optionsInfo.hyphenatedNewCategoryName.name)
          .setDescription('Hyphenated name for the new category.')
          .setRequired(optionsInfo.hyphenatedNewCategoryName.required)
      )
      .addRoleOption((option) =>
        option
          .setName(optionsInfo.internalRole.name)
          .setDescription('@internal-stack-role for domestic. @internal-cohort-role for international')
          .setRequired(optionsInfo.internalRole.required)
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    const { guild, options } = interaction;
    const domesticOrInternational = options.getString(
      optionsInfo.domesticOrInternational.name,
      optionsInfo.domesticOrInternational.required
    );
    const hyphenatedNewCategoryName = options.getString(
      optionsInfo.hyphenatedNewCategoryName.name,
      optionsInfo.hyphenatedNewCategoryName.required
    );
    const internalRole = options.getRole(optionsInfo.internalRole.name, optionsInfo.internalRole.required);

    const keyRoles = getKeyRolesInfo(guild);

    if (domesticOrInternational === 'domestic' && !keyRoles.isInternalStackRole(internalRole.id)) {
      return interaction.reply(
        formatSimpleError(`${optionsInfo.internalRole.name} must start with ${italic(keyRoles.prefixes.internalStack)}`)
      );
    }

    if (domesticOrInternational === 'international' && !keyRoles.isInternalInternationalCohortRole(internalRole.id)) {
      return interaction.reply(
        formatSimpleError(
          `${optionsInfo.internalRole.name} must start with ${italic(keyRoles.prefixes.internalCohortInternational)}`
        )
      );
    }

    const newCategory = await guild.channels.create({
      name: hyphenatedNewCategoryName,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id:
            domesticOrInternational === 'domestic'
              ? keyRoles.stackInternalAll.id
              : keyRoles.stackInternalAllInternational.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
        },
        {
          id: keyRoles.instructor.id,
          allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles],
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: internalRole.id,
          allow: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
        },
      ],
    });

    const newChannel = await guild.channels.create({
      name: `${hyphenatedNewCategoryName}-general`,
      type: ChannelType.GuildText,
      parent: newCategory,
      permissionOverwrites: [...newCategory.permissionOverwrites.cache.values()],
    });

    return interaction.reply(
      formatSimpleSuccess(
        `Click this new channel ${newChannel} to see the new category. Rename or remove the new channel as needed.`
      )
    );
  },
});
