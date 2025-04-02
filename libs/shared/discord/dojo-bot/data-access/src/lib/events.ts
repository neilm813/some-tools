import { ClientEvents } from 'discord.js';

import { serverMemberFindOneByEmailOrDiscordId } from '@some-tools/shared/api/data-access';
import {
  eventDataTransferMappers,
  guildOrCallbackHandler,
  userIdFromEvent,
} from '@some-tools/shared/discord/data-access';
import { type DiscordEventArgsToDataTransfer, GuildOrGetGuildCallback } from '@some-tools/shared/discord/types';
import { forwardDiscordEventDataTransferObjectsToLearn } from '@some-tools/shared/learn/data-access';
import { isFail, ok } from '@some-tools/shared/utils/try-fail';

/**
 * This is just used for forwarding the event data, the return value is not used currently.
 */
export const forwardDiscordEventToLearn = async <EventName extends keyof DiscordEventArgsToDataTransfer>(
  isProduction: boolean,
  guildOrCallback: GuildOrGetGuildCallback | null,
  eventName: EventName,
  ...eventArgs: ClientEvents[EventName]
) => {
  if (!isProduction) {
    return ok(null);
  }

  // This could be turned into a fail if faults are needed from this later
  if (guildOrCallback === null) {
    return ok(null);
  }

  const guildResult = guildOrCallbackHandler(guildOrCallback);

  if (isFail(guildResult)) {
    return guildResult;
  }

  const guild = guildResult.value;

  const discordUserId = userIdFromEvent[eventName](...eventArgs);

  if (!discordUserId) {
    // This could be turned into a Fail if faults are needed to be used from this later.
    return ok(null);
  }

  const serverMemberResult = await serverMemberFindOneByEmailOrDiscordId({
    emailOrDiscordId: discordUserId,
    guildId: guild.id,
  });

  if (isFail(serverMemberResult)) {
    return serverMemberResult;
  }

  const { email, roles } = serverMemberResult.value;

  const partialServerMember = {
    email,
    roles: roles.map((id) => ({ id, name: guild.roles.cache.get(id)?.name || null })),
  };

  const dataTransferEventArgs = eventDataTransferMappers[eventName](...eventArgs);

  return forwardDiscordEventDataTransferObjectsToLearn({
    serverMember: partialServerMember,
    eventData: {
      date: new Date(),
      name: eventName,
      parameters: dataTransferEventArgs,
    },
  });
};
