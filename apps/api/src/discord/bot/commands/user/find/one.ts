import { serverMemberFindOneByEmailOrDiscordId } from '@some-tools/shared/api/data-access';
import { formatSimpleError, makeModularSlashSubcommand } from '@some-tools/shared/discord/some-bot/data-access';
import { createUserInfoEmbed, makeOptionsInfo } from '@some-tools/shared/discord/some-bot/data-access';
import { taBuddyGetUserInfoEmbedFields } from '@some-tools/shared/ta-buddy/data-access';
import { isFail } from '@some-tools/shared/utils/try-fail';

const optionsInfo = makeOptionsInfo({
  emailOrDiscordId: true,
});

export const findByIdentifierSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('one')
      .setDescription('Displays general information about the user.')
      .addStringOption((option) =>
        option
          .setName(optionsInfo.emailOrDiscordId.name)
          .setDescription("The target user's enrollment email or discord ID (right click to copy id).")
          .setRequired(optionsInfo.emailOrDiscordId.required)
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    // Deferred in case this command is ran while another command has triggered the rate limit so that this command
    // won't timeout while waiting to reply.
    await interaction.deferReply();

    const { options, guild } = interaction;
    const emailOrDiscordId = options.getString(
      optionsInfo.emailOrDiscordId.name,
      optionsInfo.emailOrDiscordId.required
    );
    const serverMemberResult = await serverMemberFindOneByEmailOrDiscordId({ guildId: guild.id, emailOrDiscordId });

    if (isFail(serverMemberResult)) {
      return interaction.editReply(formatSimpleError(serverMemberResult.fault.message));
    }
    const taBuddyPromise = taBuddyGetUserInfoEmbedFields(serverMemberResult.value.email);

    const userInfoMessage = await createUserInfoEmbed(interaction.guild, serverMemberResult.value);
    await interaction.editReply({ embeds: [userInfoMessage] });

    const taBuddyData = await taBuddyPromise;

    const userInfoMessageWithTaBuddyInfo = await createUserInfoEmbed(
      interaction.guild,
      serverMemberResult.value,
      taBuddyData
    );

    return interaction.editReply({ embeds: [userInfoMessageWithTaBuddyInfo] });
  },
});
