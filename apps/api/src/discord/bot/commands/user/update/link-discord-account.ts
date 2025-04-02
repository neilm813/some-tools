import { serverMemberLinkDiscordAccount } from '@some-tools/shared/api/data-access';
import {
  createUserInfoEmbed,
  formatSimpleError,
  makeModularSlashSubcommand,
  makeOptionsInfo,
} from '@some-tools/shared/discord/some-bot/data-access';
import { isFail } from '@some-tools/shared/utils/try-fail';

const optionsInfo = makeOptionsInfo({
  email: true,
  discordId: true,
});

export const linkOneServerMemberDiscordAccountSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('link-discord-account')
      .setDescription('Links a database user with a discord user account.')
      .addStringOption((option) =>
        option
          .setName(optionsInfo.email.name)
          .setRequired(optionsInfo.email.required)
          .setDescription('The email of the database user.')
      )
      .addStringOption((option) =>
        option
          .setName(optionsInfo.discordId.name)
          .setRequired(optionsInfo.discordId.required)
          .setDescription('The discord account id to link to the database user (right click to copy id).')
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    await interaction.deferReply();

    const { guild, options } = interaction;

    const email = options.getString(optionsInfo.email.name, optionsInfo.email.required);
    const discordIdToLink = options.getString(optionsInfo.discordId.name, optionsInfo.discordId.required);

    const linkDiscordAccountResult = await serverMemberLinkDiscordAccount({
      guildId: guild.id,
      email: email,
      discordId: discordIdToLink,
    });

    if (isFail(linkDiscordAccountResult)) {
      return interaction.editReply(formatSimpleError(linkDiscordAccountResult.fault.message));
    }

    const updatedServerMember = linkDiscordAccountResult.value;

    const userInfoEmbed = await createUserInfoEmbed(guild, updatedServerMember);

    return interaction.editReply({ embeds: [userInfoEmbed] });
  },
});
