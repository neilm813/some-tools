import { ActionRowBuilder, ButtonBuilder, MessageActionRowComponentBuilder } from '@discordjs/builders';
import { ButtonStyle, ComponentType, PermissionsBitField } from 'discord.js';

import {
  formatSimpleError,
  formatSimpleSuccess,
  formatSimpleWarning,
  makeModularSlashSubcommand,
  makeOptionsInfo,
} from '@some-tools/shared/discord/some-bot/data-access';
import { tryFailAsync, unwrapFails, unwrapOks } from '@some-tools/shared/utils/try-fail';

const optionsInfo = makeOptionsInfo({
  rolesToDelete: true,
});

const buttonIds = {
  confirm: 'deleteRoleConfirm',
  cancel: 'deleteRoleCancel',
};

export const deleteManyRoles = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('many')
      .setDescription('Deletes the specified roles')
      .addStringOption((option) =>
        option
          .setName(optionsInfo.rolesToDelete.name)
          .setDescription('Roles to delete')
          .setRequired(optionsInfo.rolesToDelete.required)
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    const { options, guild, channel, member } = interaction;
    await interaction.deferReply({ ephemeral: true });

    // if for some reason the channel doesn't exist, something weird as heck happened. Just exit
    if (!channel) {
      return interaction.editReply({
        content: formatSimpleError(`Error: Channel not found.`),
      });
    }

    if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.editReply({
        content: formatSimpleError(`Error: ${member} does not have permission to manage roles`),
      });
    }

    const roles = options.resolved?.roles;

    if (!roles || roles.size < 1) {
      return interaction.editReply({ content: formatSimpleError('No roles were mentioned') });
    }

    const confirmButton = new ButtonBuilder()
      .setCustomId(buttonIds.confirm)
      .setLabel('DELETE FOREVER')
      .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
      .setCustomId(buttonIds.cancel)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents([confirmButton, cancelButton]);

    await interaction.editReply({
      content: `Delete the following roles? ${roles.map((role) => `${role}`)}`,
      components: [row],
    });

    // try to get the button interaction
    // filter to make sure its one of the two required custom IDs
    const buttonSubmit = await channel.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 10000,
      filter: (i) =>
        i.user.id === interaction.user.id && (i.customId === buttonIds.confirm || i.customId === buttonIds.cancel),
    });

    if (buttonSubmit.customId === buttonIds.cancel) {
      return await interaction.editReply({
        content: formatSimpleWarning('Role deletion canceled.'),
        components: [],
      });
    }

    const deletionAttempts = roles.map((role) => {
      return tryFailAsync(
        async () => {
          await guild.roles.delete(role);
          return role.name;
        },
        () => role.name
      );
    });

    const deletionResults = await Promise.all(deletionAttempts);
    const successfullyDeletedRoles = unwrapOks(deletionResults);
    const unsuccessfullyDeletedRoles = unwrapFails(deletionResults);

    const statusMessage = [
      successfullyDeletedRoles.length
        ? formatSimpleSuccess(`Roles successfully deleted: ${successfullyDeletedRoles.join(' ')}`)
        : '',
      unsuccessfullyDeletedRoles.length
        ? formatSimpleError(`Failed to delete roles: ${unsuccessfullyDeletedRoles.join(' ')}`)
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    return await buttonSubmit.reply({ content: statusMessage, ephemeral: true });
  },
});
