import { italic } from 'discord.js';

import { serverMemberBanOne, serverMemberUnbanOne } from '@some-tools/shared/api/data-access';
import {
  formatSimpleError,
  formatSimpleSuccess,
  makeModularSlashSubcommand,
} from '@some-tools/shared/discord/some-bot/data-access';
import { makeOptionsInfo } from '@some-tools/shared/discord/some-bot/data-access';
import { DISCORD_JOIN_URL } from '@some-tools/shared/discord/some-bot/environments';
import { isFail } from '@some-tools/shared/utils/try-fail';

const optionsInfo = makeOptionsInfo({
  emailOrDiscordId: true,
  banChoice: true,
});

// If we want to provide all the ban options that exist in the discord GUI such as delete message time increments
// this command should be split into ban and unban or the ban-specific options need to be optional and ignored for unban.

export const banOrUnbanOneSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('ban-or-unban-one')
      .setDescription('Bans (expels) a user or unbans a user.')
      .addStringOption((option) =>
        option
          .setName(optionsInfo.emailOrDiscordId.name)
          .setRequired(optionsInfo.emailOrDiscordId.required)
          .setDescription("The target user's enrollment email or discord ID (right click to copy id).")
      )
      .addStringOption((option) =>
        option
          .setName(optionsInfo.banChoice.name)
          .setRequired(optionsInfo.banChoice.required)
          .setDescription('Choose to ban or unban.')
          .addChoices({ name: 'ban', value: 'ban' }, { name: 'unban', value: 'unban' })
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    await interaction.deferReply();

    const { options, guild } = interaction;
    const emailOrDiscordId = options.getString(
      optionsInfo.emailOrDiscordId.name,
      optionsInfo.emailOrDiscordId.required
    );

    const banChoice = options.getString(optionsInfo.banChoice.name, optionsInfo.banChoice.required);

    const endpointParams = { guildId: guild.id, emailOrDiscordId };

    if (banChoice === 'ban') {
      const result = await serverMemberBanOne(endpointParams);

      if (isFail(result)) {
        return interaction.editReply(formatSimpleError(result.fault.message));
      }

      return interaction.editReply(
        formatSimpleSuccess(
          `The discord user with username ${italic(
            result.value.user.username
          )} has been banned . The ban list is visible in server settings -> bans.`
        )
      );
    } else {
      const result = await serverMemberUnbanOne(endpointParams);

      if (isFail(result)) {
        return interaction.editReply(formatSimpleError(result.fault.message));
      }

      return interaction.editReply(
        formatSimpleSuccess(
          `The discord user with username ${italic(
            result.value.username
          )} has been unbanned and can join again from ${DISCORD_JOIN_URL}`
        )
      );
    }
  },
});
