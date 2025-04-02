import {
  CategoryChannel,
  type Events,
  type Guild,
  type GuildBasedChannel,
  Message,
  TextChannel,
  type VoiceBasedChannel,
} from 'discord.js';

import { formatSimpleError } from '@some-tools/shared/discord/data-access';
import {
  EMOJIS,
  makeUnidentifiedFault,
  messageFromError,
  type UnidentifiedFault,
} from '@some-tools/shared/utils/common';
import { fail, type Result, tryFailAsync } from '@some-tools/shared/utils/try-fail';

import { getKeyRolesInfo } from './keyRolesInfo';

/**
 * Utility function for sending messages to a dedicated log channel. The log channel is called 'some-bot-log'
 * @param guild The guild where the channel exists
 * @param message The message to send. This param can take any type accepted by TextChannel.send()
 * @returns Promise<Result<Message<true>, UnidentifiedError>>
 */
export const sendToLogChannel = async (guild: Guild, ...messageOptions: Parameters<TextChannel['send']>) => {
  return tryFailAsync(async () => {
    const guildChannels = guild.channels;

    const logChannel = guildChannels.cache.find((channel: GuildBasedChannel) => channel.name === 'some-bot-log');
    if (!logChannel) {
      throw new Error("'some-bot-log' channel does not exist");
    }

    if (!(logChannel instanceof TextChannel)) {
      throw new Error("'some-bot-log' channel is not a Text Channel.");
    }

    return logChannel.send(...messageOptions);
  }, makeUnidentifiedFault);
};

export const sendEventErrorToLogChannel = (guild: Guild | null, eventName: Events, error: unknown) => {
  console.log(`Error in ${eventName}: ${error}`);

  if (guild) {
    return sendToLogChannel(guild, formatSimpleError(`Error in ${eventName} event: ${messageFromError(error)}`));
  }
  return fail(makeUnidentifiedFault('No guild provided.'));
};

/**
 * The temp channel role is added to channels that are to be deleted later. It's a hack to avoid extra DB tracking.
 */
export const isTempVoiceChannel = (channel: VoiceBasedChannel) =>
  channel.permissionOverwrites.cache.has(getKeyRolesInfo(channel.guild).tempChannel.id);

/**
 * These notification channels are part of stack or program channel categories visible to staff only for notifications
 * when students join auto voice channels like the help channel.
 */
export const isInternalNotificationChannel = (channel: GuildBasedChannel) => channel.name.endsWith('-notifications');

/**
 * Auto voice channels with this naming convention will trigger an internal notification to staff when a student joins
 * See {@link sendToNotificationChannelInCategory}
 */
export const shouldVoiceChannelTriggerNotification = (channel: VoiceBasedChannel) => channel.name.includes(EMOJIS.bell);

/**
 *
 * @param channel This will be used to find the related notification channel.
 *    - If {@link CategoryChannel} the {@link CategoryChannel.children} are searched for a notification channel.
 *    - If {@link GuildBasedChannel} the {@link GuildBasedChannel.parent} to get to the
 *    {@link CategoryChannel.children} to search them for a notification channel.
 */
export const sendToNotificationChannelInCategory = async (
  channel: GuildBasedChannel,
  ...messageOptions: Parameters<TextChannel['send']>
): Promise<Result<Message<true>, UnidentifiedFault>> => {
  let notificationChannel: GuildBasedChannel | undefined = undefined;

  if (channel instanceof CategoryChannel) {
    notificationChannel = channel.children.cache.find((childChannel) => isInternalNotificationChannel(childChannel));
  } else {
    const parent = channel.parent;

    if (parent instanceof CategoryChannel) {
      notificationChannel = parent.children.cache.find((childChannel) => isInternalNotificationChannel(childChannel));
    }
  }

  if (!notificationChannel) {
    // Lazy, no error types created.
    return fail(makeUnidentifiedFault('Notification channel not found.'));
  }

  if (notificationChannel instanceof TextChannel) {
    // tryFailAsync was still thinking notificationChannel could be undefined for some reason without this.
    const notificationTextChannel: TextChannel = notificationChannel;
    return tryFailAsync(() => notificationTextChannel.send(...messageOptions), makeUnidentifiedFault);
  }

  return fail(makeUnidentifiedFault('Notification channel was expected to be a text channel.'));
};
