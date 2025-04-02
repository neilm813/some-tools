/*
Most objects in discord.js like GuildMember are class instances and many of the props are getters that will not be
included in JSON when passed via HTTP. These types represent which props we will explicitly access to include when
needing to send via HTTP.

Internally these types will be used in the request body when needed but not in the response since the response can
just include the id which can be used in discord.js to retrieve the full class instance.
*/

import type {
  Channel,
  Emoji,
  Guild,
  GuildMember,
  Message,
  MessageReaction,
  PartialMessage,
  PartialMessageReaction,
  PartialUser,
  Role,
  User,
  VoiceState,
} from 'discord.js';

export type DiscordChannelData = Pick<Channel, 'id' | 'type'> & {
  guild: DiscordGuildData | null;
};

export type DiscordEmojiData = Pick<Emoji, 'id' | 'identifier' | 'name'>;

export type DiscordGuildData = Pick<Guild, 'applicationId' | 'id' | 'memberCount' | 'name'>;

export type DiscordUserData = Pick<User, 'createdAt' | 'createdTimestamp' | 'id' | 'username'>;

export type DiscordPartialUserData = Pick<User | PartialUser, 'createdAt' | 'createdTimestamp' | 'id' | 'username'>;

export type DiscordGuildMemberData = Pick<GuildMember, 'id' | 'joinedAt' | 'joinedTimestamp' | 'nickname'> & {
  guild: DiscordGuildData;
  user: DiscordUserData;
  roles: Pick<Role, 'name' | 'id'>[];
};

export type DiscordMessageData = Pick<
  Message | PartialMessage,
  'channelId' | 'content' | 'createdAt' | 'createdTimestamp' | 'guildId' | 'id' | 'type'
> & {
  author: DiscordUserData | null;
  channel: DiscordChannelData;
  guild: DiscordGuildData | null;
  member: DiscordGuildMemberData | null;
};

export type DiscordMessageReactionData = Pick<MessageReaction | PartialMessageReaction, 'count'> & {
  emoji: DiscordEmojiData;
  message: DiscordMessageData;
};

export type DiscordVoiceStateData = Pick<VoiceState, 'channelId' | 'id'> & {
  channel: DiscordChannelData | null;
  guild: DiscordGuildData;
  member: DiscordGuildMemberData | null;
};

export type DiscordEventArgsToDataTransfer = {
  guildMemberAdd: { member: DiscordGuildMemberData };
  messageCreate: { message: DiscordMessageData };
  messageReactionAdd: {
    messageReaction: DiscordMessageReactionData;
    user: DiscordPartialUserData;
  };
  voiceStateUpdate: {
    oldState: DiscordVoiceStateData;
    newState: DiscordVoiceStateData;
  };
};

export type DiscordTransferredEventData = {
  eventData: {
    date: Date;
    name: keyof DiscordEventArgsToDataTransfer;
    parameters: DiscordEventArgsToDataTransfer[keyof DiscordEventArgsToDataTransfer];
  };
};
