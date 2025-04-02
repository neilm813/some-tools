import { EmbedBuilder, roleMention, userMention } from '@discordjs/builders';
import { EmbedField, Guild, italic } from 'discord.js';

import { type DiscordServerMember } from '@some-tools/shared/api/types';
import { formatSimpleError, formatSimpleWarning } from '@some-tools/shared/discord/data-access';
import { isOk } from '@some-tools/shared/utils/try-fail';

import { guildMemberLinkedFetch } from './members';

// TODO: fetch the data in this func for convenience and use Promise.all on it?
export const createUserInfoEmbed = async (
  guild: Guild,
  serverMember: DiscordServerMember,
  taBuddyInfoEmbeds?: EmbedField[]
): Promise<EmbedBuilder> => {
  const guildMemberResult = await guildMemberLinkedFetch(guild, serverMember, true);

  const sortedUserRoles = serverMember.roles
    .filter((roleId) => guild.roles.cache.has(roleId))
    .sort((a, b) => {
      const roleA = guild.roles.cache.get(a);
      const roleB = guild.roles.cache.get(b);

      if (!roleA && !roleB) {
        return 0;
      }

      if (!roleA) {
        return 1;
      }

      if (!roleB) {
        return -1;
      }

      return roleA.name.toLowerCase().localeCompare(roleB.name.toLowerCase());
    });

  const userInfoEmbed = new EmbedBuilder().setColor(0x07a9e1).addFields(
    { name: 'First Name', value: serverMember.firstName },
    { name: 'Last Name', value: serverMember.lastName },
    { name: 'Email', value: serverMember.email },
    { name: 'Discord User Id', value: serverMember.discordId ? serverMember.discordId : 'N/A' },
    {
      name: 'Roles (DB Copy)',
      value: serverMember.roles.length > 0 ? sortedUserRoles.map((role) => roleMention(role)).join(' ') : 'None',
    }
  );

  if (isOk(guildMemberResult)) {
    const guildMember = guildMemberResult.value;
    const avatarURL = guildMember.user.avatarURL();

    userInfoEmbed.addFields(
      { name: 'Nickname', value: guildMember.nickname ? guildMember.nickname : 'N/A' },
      { name: 'Username', value: `${guildMember.user.username}` },
      {
        name: 'User Mention',
        value: `${userMention(guildMember.user.id)}\n${italic(
          'Mention not working? Paste it into a message and press send.'
        )}`,
      }
    );
    userInfoEmbed.setThumbnail(avatarURL);
  } else {
    const fault = guildMemberResult.fault;

    userInfoEmbed.addFields({
      name:
        fault._code === 'MEMBER_LINKED_NOT_IN_GUILD' || fault._code === 'MEMBER_NOT_LINKED'
          ? formatSimpleWarning('Warning:')
          : formatSimpleError('Error:'),
      value: fault.message,
    });
  }

  if (taBuddyInfoEmbeds) {
    taBuddyInfoEmbeds.map((e: EmbedField) => {
      userInfoEmbed.addFields(e);
    });
  }

  return userInfoEmbed;
};
