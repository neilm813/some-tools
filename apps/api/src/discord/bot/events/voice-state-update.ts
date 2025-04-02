import { ChannelType, Events, Snowflake, type VoiceState } from 'discord.js';

import {
  getKeyRolesInfo,
  handleAutoCreateVoiceChannel,
  sendEventErrorToLogChannel,
  sendToNotificationChannelInCategory,
} from '@some-tools/shared/discord/some-bot/data-access';
import { isTempVoiceChannel } from '@some-tools/shared/discord/some-bot/data-access';
import { forwardDiscordEventToLearn } from '@some-tools/shared/discord/some-bot/data-access';
import { EMOJIS } from '@some-tools/shared/utils/common';

import { PRODUCTION } from '../../../environments';
import { discordClient } from '../config';

const autoVoiceChannelRecentNotifications: Map<Snowflake, Set<Snowflake>> = new Map();
const isMemberOnAutoVoiceChannelNotificationTimeout = (memberId: Snowflake, channelId: Snowflake) =>
  Boolean(autoVoiceChannelRecentNotifications.get(memberId)?.has(channelId));

/**
 * This won't work if there's load balancing since it's just in memory.
 * This is used to prevent spamming notifications if a user joins, leaves, and rejoins and auto voice channel that
 * triggers a notification too quickly.
 */
const manageAutoVoiceChannelNotificationTimeout = (memberId: Snowflake, channelId: Snowflake) => {
  if (!autoVoiceChannelRecentNotifications.has(memberId)) {
    autoVoiceChannelRecentNotifications.set(memberId, new Set());
  }

  const channelIds = autoVoiceChannelRecentNotifications.get(memberId);

  if (!channelIds) {
    return;
  }

  channelIds.add(channelId);

  setTimeout(() => {
    channelIds.delete(channelId);

    if (channelIds.size === 0) {
      autoVoiceChannelRecentNotifications.delete(memberId);
    }
  }, 20 * 1000);
};

const manageAutoVoiceChannel = async (oldState: VoiceState, newState: VoiceState) => {
  const keyRolesInfo = getKeyRolesInfo(newState.guild);

  await handleAutoCreateVoiceChannel({
    eventArgs: [oldState, newState],
    isTempVoiceChannel: async (channel) => isTempVoiceChannel(channel),

    isAutoCreateVoiceChannel: async (channel) => channel.name.startsWith(EMOJIS.signPlus),

    onJoinAutoCreateVoiceChannel: async (autoCreateVoiceChannel) =>
      autoCreateVoiceChannel.guild.channels.create({
        name: autoCreateVoiceChannel.name.replace(EMOJIS.signPlus, EMOJIS.signMinus).replace(EMOJIS.bell, ''),
        type: ChannelType.GuildVoice,
        parent: autoCreateVoiceChannel.parent,
        topic: 'temp',
        userLimit: autoCreateVoiceChannel.userLimit,
        /**
         * Permission denies are applied before allows allowing allows to
         * overwrite denies.
         */
        permissionOverwrites: [
          ...autoCreateVoiceChannel.permissionOverwrites.cache.values(),
          {
            id: keyRolesInfo.student.id,
            allow: ['ManageChannels'],
          },
          {
            id: keyRolesInfo.alumni.id,
            allow: ['ManageChannels'],
          },
          {
            id: keyRolesInfo.tempChannel.id,
            allow: ['ViewChannel'],
          },
        ],
      }),

    onMoveMemberToCreatedTempVoiceChannel: async (autoCreateVoiceChannel, tempVoiceChannelMovedInto, member) => {
      const shouldTriggerNotification =
        autoCreateVoiceChannel.name.endsWith(EMOJIS.bell) &&
        !keyRolesInfo.isEmployee(member) &&
        !isMemberOnAutoVoiceChannelNotificationTimeout(member.id, autoCreateVoiceChannel.id);

      const cohortRole = keyRolesInfo.getGuildMembersCohortRole(member);
      const teacherAssistantRole = keyRolesInfo.getTeacherAssistantRoleForStudent(member);

      if (shouldTriggerNotification) {
        const notificationMessage = `${teacherAssistantRole} ${
          cohortRole ? cohortRole : ''
        }| ${member} joined ${tempVoiceChannelMovedInto}`;

        await sendToNotificationChannelInCategory(tempVoiceChannelMovedInto, notificationMessage);

        manageAutoVoiceChannelNotificationTimeout(member.id, autoCreateVoiceChannel.id);
      }
    },
  });
};

discordClient.on(
  Events.VoiceStateUpdate,
  /**
   * @see [docs](https://discord.js.org/#/docs/discord.js/14.5.0/class/Client?scrollTo=e-voiceStateUpdate)
   */
  async (oldState, newState) => {
    try {
      forwardDiscordEventToLearn(PRODUCTION, newState.guild, Events.VoiceStateUpdate, oldState, newState).catch(
        () => null
      );
      await manageAutoVoiceChannel(oldState, newState);
    } catch (error) {
      console.log(Events.VoiceStateUpdate, error);
      sendEventErrorToLogChannel(newState.guild, Events.VoiceStateUpdate, error);
    }
  }
);
