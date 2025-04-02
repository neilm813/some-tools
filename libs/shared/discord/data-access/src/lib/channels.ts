import { type ClientEvents, type GuildMember, type VoiceBasedChannel } from 'discord.js';

type HandleAutoCreateVoiceChannelOptions = {
  eventArgs: ClientEvents['voiceStateUpdate'];
  /**
   * Used to identify if the channel being joined is an auto voice channel that should trigger the
   * `onJoinAutoCreateVoiceChannel` callback to create a new temp voice channel that the member is moved into.
   */
  isAutoCreateVoiceChannel: (channel: VoiceBasedChannel) => Promise<boolean>;

  /**
   * Used to identify whether a voice channel was created by the joining the auto voice channel.
   */
  isTempVoiceChannel: (channel: VoiceBasedChannel) => Promise<boolean>;

  /**
   * Called when the member joins the a voice channel where `isAutoCreateVoiceChannel` is `true`.
   *
   * Use `await newState.guild.channels.create` to create the temp voice channel that they should be moved into.
   *
   * The old voice state has no channel if went from being in no voice channel to joining;
   * it will have a channel if they joined by switching voice channels.
   */
  onJoinAutoCreateVoiceChannel: (
    autoCreateVoiceChannel: VoiceBasedChannel,
    member: GuildMember,
    eventArgs: ClientEvents['voiceStateUpdate']
  ) => Promise<VoiceBasedChannel>;

  /**
   * Called when the user is moved into the temp voice channel made for them by joining an auto create voice channel.
   *
   * @param autoCreateVoiceChannel The auto create voice channel they joined that triggered the creation of a new temp
   *    voice channel that they were moved into. This should be the same channel as `oldState.channel` since on move
   *    they are leaving the auto create channel to be joined to the new temp voice channel.
   * @param tempVoiceChannelMovedInto The channel created from `onJoinAutoCreateVoiceChannel` which should be the same
   *    as `newState.channel`.
   * @param member The guild member being moved.
   * @param eventArgs The original args given to the `voiceStateUpdate` event.
   */
  onMoveMemberToCreatedTempVoiceChannel?: (
    autoCreateVoiceChannel: VoiceBasedChannel,
    tempVoiceChannelMovedInto: VoiceBasedChannel,
    member: GuildMember,
    eventArgs: ClientEvents['voiceStateUpdate']
  ) => Promise<unknown>;

  /**
   * Called when the user leaves a channel where `isTempVoiceChannel` is `true` and the new voice state has no channel,
   * meaning they left without joining another voice channel.
   *
   * The temp channel will be cleaned up when everyone leaves whether or not this callback is provided.
   */
  onLeaveTempVoiceChannel?: (
    voiceChannelLeft: VoiceBasedChannel,
    eventArgs: ClientEvents['voiceStateUpdate']
  ) => Promise<unknown>;
};

/*
TODO:
add fault mappers for channel delete, voice move, channel create on join failed

Voice move error:
DiscordAPIError[40032]: Target user is not connected to voice.
*/
/**
 * This function should be used in the
 * {@link [voiceStateUpdate](https://discord.js.org/#/docs/discord.js/14.5.0/class/Client?scrollTo=e-voiceStateUpdate)}
 * It will automatically handle moving the member into the newly created voice channel and deleting the temp voice
 * channels when the last member leaves.
 * The rest of the custom functionality is handled through the given callbacks.
 *
 * An auto voice channel is a channel that when joined should create a temporary voice channel that the user who joined
 * is moved into.
 *
 * The temporary voice channel should be deleted once everyone has left.
 *
 * The `voiceState.member` is nullable in the case that they are in a voice channel and get removed from the guild,
 * they are then disconnected from the channel after they have been removed and so there is no related guild member.
 */
export const handleAutoCreateVoiceChannel = async (options: HandleAutoCreateVoiceChannelOptions): Promise<unknown> => {
  const {
    eventArgs,
    isTempVoiceChannel,
    isAutoCreateVoiceChannel,
    onJoinAutoCreateVoiceChannel,
    onMoveMemberToCreatedTempVoiceChannel,
    onLeaveTempVoiceChannel,
  } = options;
  const [oldState, newState] = eventArgs;
  const { channel: channelJoined, member } = newState;
  const { channel: channelLeft } = oldState;

  // Early exit if member hasn't changed channels. Not sure if this ever happens but it was added at some point.
  if (channelLeft?.id === channelJoined?.id) {
    return;
  }

  if (channelLeft) {
    const isTempVoice = await isTempVoiceChannel(channelLeft);

    if (isTempVoice) {
      if (channelLeft.members.size === 0) {
        await channelLeft.delete();
      }

      if (onLeaveTempVoiceChannel) {
        await onLeaveTempVoiceChannel(channelLeft, eventArgs);
      }
    }
  }

  if (channelJoined) {
    if (!member) {
      return;
    }

    const isAutoCreateVoice = await isAutoCreateVoiceChannel(channelJoined);

    if (isAutoCreateVoice) {
      const autoCreateVoiceChannelJoined = channelJoined;

      const tempVoiceChannel = await onJoinAutoCreateVoiceChannel(autoCreateVoiceChannelJoined, member, eventArgs);
      await member.voice.setChannel(tempVoiceChannel);

      if (onMoveMemberToCreatedTempVoiceChannel) {
        await onMoveMemberToCreatedTempVoiceChannel(autoCreateVoiceChannelJoined, tempVoiceChannel, member, eventArgs);
      }
    }
  }
  return;
};
