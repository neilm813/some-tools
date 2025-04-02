import { serverMemberUpdateOneAndLinkedGuildMember } from '@some-tools/shared/api/data-access';
import { formatSimpleError, makeModularSlashSubcommand } from '@some-tools/shared/discord/some-bot/data-access';
import { createUserInfoEmbed, makeOptionsInfo } from '@some-tools/shared/discord/some-bot/data-access';
import { isFail } from '@some-tools/shared/utils/try-fail';

const optionsInfo = makeOptionsInfo({
  emailOrDiscordId: true,
  fieldToUpdate: true,
  updatedData: true,
});

export const updateByIdentifierSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('one')
      .setDescription('Updates a user in the database. Some updates trigger the related discord user to be updated.')
      .addStringOption((option) =>
        option
          .setName(optionsInfo.emailOrDiscordId.name)
          .setDescription("The target user's enrollment email or discord ID (right click to copy id).")
          .setRequired(optionsInfo.emailOrDiscordId.required)
      )
      .addStringOption((option) =>
        option
          .setName(optionsInfo.fieldToUpdate.name)
          .setRequired(optionsInfo.fieldToUpdate.required)
          .setDescription('The field in the database to update.')
          .addChoices(
            { name: 'First Name', value: 'firstName' },
            { name: 'Last Name', value: 'lastName' },
            { name: 'Email', value: 'email' }
          )
      )
      .addStringOption((option) =>
        option
          .setName(optionsInfo.updatedData.name)
          .setRequired(optionsInfo.updatedData.required)
          .setDescription(`The updated data for the selected ${optionsInfo.fieldToUpdate.name}.`)
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    await interaction.deferReply();

    const { options, guild } = interaction;

    const emailOrDiscordId = options.getString(
      optionsInfo.emailOrDiscordId.name,
      optionsInfo.emailOrDiscordId.required
    );
    const fieldToUpdate = options.getString(optionsInfo.fieldToUpdate.name, optionsInfo.fieldToUpdate.required);
    const updatedData = options.getString(optionsInfo.updatedData.name, optionsInfo.updatedData.required);

    const updatedServerMemberResult = await serverMemberUpdateOneAndLinkedGuildMember(
      { guildId: guild.id, emailOrDiscordId },
      { [fieldToUpdate]: updatedData }
    );

    if (isFail(updatedServerMemberResult)) {
      return interaction.editReply(formatSimpleError(updatedServerMemberResult.fault.message));
    }

    const userInfoMessage = await createUserInfoEmbed(interaction.guild, updatedServerMemberResult.value);
    return interaction.editReply({ embeds: [userInfoMessage] });
  },
});
