import { serverMemberLinkDiscordAccount } from '@some-tools/shared/api/data-access';
import {
  formatSimpleError,
  formatSimpleSuccess,
  makeModularSlashSubcommand,
  makeOptionsInfo,
} from '@some-tools/shared/discord/some-bot/data-access';
import {
  DISCORD_GUILD_ID, // TODO: avoid hard-coded guild id here by saving list of permitted guild ids to db users
} from '@some-tools/shared/discord/some-bot/environments';
import { DOJO_EMAILS } from '@some-tools/shared/utils/common';
import { isFail } from '@some-tools/shared/utils/try-fail';

const optionsInfo = makeOptionsInfo({
  enrollmentEmail: true,
});

export const linkOneServerMemberDiscordAccountSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('link-discord-account')
      .setDescription('Links your discord account to your coding some account.')
      .addStringOption((option) =>
        option
          .setName(optionsInfo.enrollmentEmail.name)
          .setRequired(optionsInfo.enrollmentEmail.required)
          .setDescription('The email that you used to enroll into the coding some.')
      ),
  runChatInputCommand: async (interaction) => {
    const { options, user } = interaction;

    if (interaction.inGuild()) {
      return interaction.reply(formatSimpleError('This command is only usable in a direct message to the bot.'));
    }

    const email = options.getString(optionsInfo.enrollmentEmail.name, optionsInfo.enrollmentEmail.required);

    const linkDiscordAccountResult = await serverMemberLinkDiscordAccount({
      guildId: DISCORD_GUILD_ID,
      email: email,
      discordId: user.id,
    });

    if (isFail(linkDiscordAccountResult)) {
      return interaction.reply(
        formatSimpleError(
          `${linkDiscordAccountResult.fault.message} Contact your instructor or ${DOJO_EMAILS.onboarding} for help. ${
            linkDiscordAccountResult.fault._code === 'MEMBER_LINKED_ALREADY'
              ? 'If you already linked a different account please log into that discord account.'
              : ''
          }`
        )
      );
    }

    return interaction.reply(formatSimpleSuccess('Success!'));
  },
});
