import { serverMemberUpdateLinkedGuildMember } from '@some-tools/shared/api/data-access';
import {
  createUserInfoEmbed,
  formatSimpleError,
  makeModularSlashSubcommand,
  makeOptionsInfo,
} from '@some-tools/shared/discord/some-bot/data-access';
import { isFail } from '@some-tools/shared/utils/try-fail';

const optionsInfo = makeOptionsInfo({
  email: true,
});

export const syncLinkedDiscordAccountSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('sync-linked-discord-account')
      .setDescription('Updates the linked discord account with database info, such as roles and display name.')
      .addStringOption((option) =>
        option
          .setName(optionsInfo.email.name)
          .setRequired(optionsInfo.email.required)
          .setDescription('The email of the database user.')
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    await interaction.deferReply();

    const { guild, options } = interaction;

    const email = options.getString(optionsInfo.email.name, optionsInfo.email.required);

    const serverMemberResult = await serverMemberUpdateLinkedGuildMember({
      guildId: guild.id,
      emailOrDiscordId: email,
    });

    if (isFail(serverMemberResult)) {
      return interaction.editReply(formatSimpleError(serverMemberResult.fault.message));
    }

    const userInfoEmbed = await createUserInfoEmbed(guild, serverMemberResult.value);

    return interaction.editReply({
      embeds: [userInfoEmbed],
    });
  },
});
