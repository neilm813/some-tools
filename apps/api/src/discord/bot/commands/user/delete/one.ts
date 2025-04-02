import { serverMemberDeleteOneByEmail } from '@some-tools/shared/api/data-access';
import {
  formatSimpleError,
  formatSimpleSuccess,
  makeModularSlashSubcommand,
} from '@some-tools/shared/discord/some-bot/data-access';
import { makeOptionsInfo } from '@some-tools/shared/discord/some-bot/data-access';
import { isFail } from '@some-tools/shared/utils/try-fail';

const optionsInfo = makeOptionsInfo({
  email: true,
});

export const deleteByEmailSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('one')
      .setDescription('Deletes one user from the database.')
      .addStringOption((option) =>
        option
          .setName(optionsInfo.email.name)
          .setDescription('The email of the record to delete from our discord bot database.')
          .setRequired(optionsInfo.email.required)
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    await interaction.deferReply();

    const { options, guild } = interaction;
    const email = options.getString(optionsInfo.email.name, optionsInfo.email.required);

    const deleteResult = await serverMemberDeleteOneByEmail({ guildId: guild.id, email });

    if (isFail(deleteResult)) {
      return interaction.editReply(formatSimpleError(deleteResult.fault.message));
    }

    return interaction.editReply(formatSimpleSuccess('Deleted'));
  },
});
