import { serverMemberUnlinkDiscordAccount } from '@some-tools/shared/api/data-access';
import {
  createUserInfoEmbed,
  formatSimpleError,
  makeModularSlashSubcommand,
  makeOptionsInfo,
} from '@some-tools/shared/discord/some-bot/data-access';
import { isFail } from '@some-tools/shared/utils/try-fail';

const optionsInfo = makeOptionsInfo({
  email: true,
  shouldKick: true,
});

export const unlinkOneServerMemberDiscordAccountSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('unlink-discord-account')
      .setDescription('Unlinks the database user with a discord user account and kicks the discord user.')
      .addStringOption((option) =>
        option
          .setName(optionsInfo.email.name)
          .setRequired(optionsInfo.email.required)
          .setDescription('The email of the database user.')
      )
      .addBooleanOption((option) =>
        option
          .setName(optionsInfo.shouldKick.name)
          .setRequired(optionsInfo.shouldKick.required)
          .setDescription(
            "Kicks the account being unlinked. Used if swapping accounts so there's one in the server per user."
          )
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    await interaction.deferReply();

    const { guild, options } = interaction;

    const email = options.getString(optionsInfo.email.name, optionsInfo.email.required);
    const shouldKick = options.getBoolean(optionsInfo.shouldKick.name, optionsInfo.shouldKick.required);

    const unlinkDiscordAccountResult = await serverMemberUnlinkDiscordAccount(
      {
        guildId: guild.id,
        email: email,
      },
      { shouldKick }
    );

    if (isFail(unlinkDiscordAccountResult)) {
      return interaction.editReply(formatSimpleError(unlinkDiscordAccountResult.fault.message));
    }

    const updatedServerMember = unlinkDiscordAccountResult.value;
    const userInfoEmbed = await createUserInfoEmbed(guild, updatedServerMember);

    return interaction.editReply({
      content: `The linked discord account has been unlinked${
        shouldKick ? 'and kicked' : ''
      }. The user can rejoin by first logging into their desired discord account and then visiting the join page.`,
      embeds: [userInfoEmbed],
    });
  },
});
