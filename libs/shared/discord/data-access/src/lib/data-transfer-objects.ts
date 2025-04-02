import type {
  Channel,
  ClientEvents,
  Emoji,
  Guild,
  GuildMember,
  Message,
  MessageReaction,
  PartialMessage,
  PartialMessageReaction,
  PartialUser,
  User,
  VoiceState,
} from 'discord.js';

import type {
  DiscordChannelData,
  DiscordEmojiData,
  DiscordEventArgsToDataTransfer,
  DiscordGuildData,
  DiscordGuildMemberData,
  DiscordMessageData,
  DiscordMessageReactionData,
  DiscordPartialUserData,
  DiscordUserData,
  DiscordVoiceStateData,
} from '@some-tools/shared/discord/types';

/**
 * Makes a Channel Data Transfer Object containing only the properties that will be sent via http.
 */
export const makeDiscordChannelData = (channel: Channel): DiscordChannelData => {
  const { id, type } = channel;

  return { id, type, guild: 'guild' in channel ? makeDiscordGuildData(channel.guild) : null };
};

/**
 * Makes a Emoji Data Transfer Object containing only the properties that will be sent via http.
 */
export const makeDiscordEmojiData = ({ id, identifier, name }: Emoji): DiscordEmojiData => ({
  id,
  identifier,
  name,
});

/**
 * Makes a User Data Transfer Object containing only the properties that will be sent via http.
 */
export const makeDiscordUserData = ({ createdAt, createdTimestamp, username, id }: User): DiscordUserData => ({
  createdAt,
  createdTimestamp,
  username,
  id,
});

/**
 * Makes a PartialUser Data Transfer Object containing only the properties that will be sent via http.
 */
export const makeDiscordPartialUserData = ({
  createdAt,
  createdTimestamp,
  username,
  id,
}: User | PartialUser): DiscordPartialUserData => ({
  createdAt,
  createdTimestamp,
  username,
  id,
});

/**
 * Makes a Guild Data Transfer Object containing only the properties that will be sent via http.
 */
export const makeDiscordGuildData = ({ applicationId, id, memberCount, name }: Guild): DiscordGuildData => ({
  applicationId,
  id,
  memberCount,
  name,
});

export const makeDiscordMessageData = ({
  author,
  channel,
  channelId,
  content,
  createdAt,
  createdTimestamp,
  guild,
  guildId,
  id,
  member,
  type,
}: Message | PartialMessage): DiscordMessageData => ({
  author: author && makeDiscordUserData(author),
  channel: makeDiscordChannelData(channel),
  channelId,
  content,
  createdAt,
  createdTimestamp,
  guildId,
  guild: guild && makeDiscordGuildData(guild),
  id,
  member: member && makeDiscordGuildMemberData(member),
  type,
});

export const makeDiscordMessageReactionData = ({
  count,
  emoji,
  message,
}: MessageReaction | PartialMessageReaction): DiscordMessageReactionData => ({
  count,
  emoji: makeDiscordEmojiData(emoji),
  message: makeDiscordMessageData(message),
});

/**
 * Makes a GuildMember Data Transfer Object containing only the properties that will be sent via http.
 */
export const makeDiscordGuildMemberData = ({
  id,
  guild,
  joinedAt,
  joinedTimestamp,
  nickname,
  roles,
  user,
}: GuildMember): DiscordGuildMemberData => ({
  id,
  guild: makeDiscordGuildData(guild),
  joinedAt,
  joinedTimestamp,
  nickname,
  roles: Array.from(roles.cache.values()).map(({ name, id }) => ({ name, id })),
  user: makeDiscordUserData(user),
});

/**
 * Makes a VoiceState Data Transfer Object containing only the properties that will be sent via http.
 */
export const makeDiscordVoiceStateData = ({
  channelId,
  channel,
  guild,
  id,
  member,
}: VoiceState): DiscordVoiceStateData => ({
  channelId,
  channel: channel && makeDiscordChannelData(channel),
  guild: makeDiscordGuildData(guild),
  id,
  member: member && makeDiscordGuildMemberData(member),
});

// ? A less abstract alternative could be making these separate functions called from a switch on event name
export const eventDataTransferMappers: {
  [Key in keyof DiscordEventArgsToDataTransfer]: (...args: ClientEvents[Key]) => DiscordEventArgsToDataTransfer[Key];
} = {
  guildMemberAdd: (guildMember) => ({
    member: makeDiscordGuildMemberData(guildMember),
  }),

  messageCreate: (message) => ({
    message: makeDiscordMessageData(message),
  }),

  messageReactionAdd: (messageReaction, user) => ({
    messageReaction: makeDiscordMessageReactionData(messageReaction),
    user: makeDiscordPartialUserData(user),
  }),

  voiceStateUpdate: (oldState, newState) => ({
    oldState: makeDiscordVoiceStateData(oldState),
    newState: makeDiscordVoiceStateData(newState),
  }),
};
