import { ChannelType, EmbedBuilder, TextChannel } from 'discord.js';

import {
  formatSimpleError,
  formatSimpleSuccess,
  makeModularSlashSubcommand,
  makeOptionsInfo,
} from '@some-tools/shared/discord/some-bot/data-access';
import { EMOJIS } from '@some-tools/shared/utils/common';
import { tryFailAsync, unwrapFails, unwrapOks } from '@some-tools/shared/utils/try-fail';

const optionsInfo = makeOptionsInfo({
  messageToSend: true,
  textChannels: true,
});

export const sendToEachChannelSubcommand = makeModularSlashSubcommand({
  builderCallback: (subcommand) =>
    subcommand
      .setName('send-to-each-channel')
      .setDescription('Sends the given message to the target text channels.')
      .addStringOption((option) =>
        option
          .setName(optionsInfo.textChannels.name)
          .setDescription('Mention text channels using the # symbol.')
          .setRequired(optionsInfo.textChannels.required)
      )
      .addStringOption((option) =>
        option
          .setName(optionsInfo.messageToSend.name)
          .setDescription('The message to send to target text channels.')
          .setRequired(optionsInfo.messageToSend.required)
      ),
  runChatInputCommandInCachedGuild: async (interaction) => {
    const { options, user } = interaction;

    const messageToSend = options.getString(optionsInfo.messageToSend.name, optionsInfo.messageToSend.required);
    const textChannelsString = options.getString(optionsInfo.textChannels.name, optionsInfo.textChannels.required);

    const messageToSendEmbed = new EmbedBuilder()
      .setTitle(`Message from`)
      .setDescription(`${user}`)
      .setThumbnail(user.avatarURL())
      .addFields({ name: EMOJIS.message, value: messageToSend })
      .setTimestamp();

    // early return if there are no resolved channels
    const resolvedChannels = options.resolved?.channels;
    if (!resolvedChannels) {
      return await interaction.reply(formatSimpleError('No valid channels were mentioned.'));
    }

    // filter resolved channels to only grab text channels
    const channelsToMessage = resolvedChannels.filter((channel): channel is TextChannel => {
      const isChannelMentionedOnlyInMessageToSend =
        messageToSend.includes(channel.id) && !textChannelsString.includes(channel.id);
      return channel?.type === ChannelType.GuildText && !isChannelMentionedOnlyInMessageToSend;
    });

    // early return if there are no text channels
    if (channelsToMessage.size === 0) {
      return await interaction.reply(formatSimpleError('No text channels were mentioned.'));
    }

    // send message to all specified channels
    const sentMessageResponses = channelsToMessage.map((channel) => {
      return tryFailAsync(
        async () => {
          // await channel.send(`Message from ${user}\n\n` + messageToSend);
          await channel.send({ embeds: [messageToSendEmbed] });
          return channel;
        },
        () => channel
      );
    });

    // wait for promises to settle so we can check which promises succeed and fail
    const sentMessageResults = await Promise.all(sentMessageResponses);

    const fulfilledChannels = unwrapOks(sentMessageResults);
    const rejectedChannels = unwrapFails(sentMessageResults);

    const statusMessage = [
      fulfilledChannels.length ? formatSimpleSuccess(`Message sent to: ${fulfilledChannels.join(' ')}`) : '',
      rejectedChannels.length ? formatSimpleError(`Failed to send to: ${rejectedChannels.join(' ')}`) : '',
    ]
      .filter(Boolean)
      .join('\n');

    await interaction.reply(statusMessage);
  },
});
