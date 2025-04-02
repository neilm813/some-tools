/**
 * ! This is partially type-unsafe if types are not shared properly.
 * `axios.get<SomeType>` simply asserts the `response.data` is of that type without verification.
 * However, since the API and this lib are sharing the same type, as long as it's shared properly, a change to the
 * shared type in the API will be detected here.
 */

import axios from 'axios';

import type {
  DiscordServerMember,
  ServerMemberBanOneRouteInfo,
  ServerMemberCreateOneRouteInfo,
  ServerMemberDeleteOneByEmailRouteInfo,
  ServerMemberFindManyRouteInfo,
  ServerMemberFindOneByEmailOrDiscordIdRouteInfo,
  ServerMemberJoinGuildRouteInfo,
  ServerMemberKickManyRouteInfo,
  ServerMemberLinkDiscordAccountRouteInfo,
  ServerMemberLinkedGuildMemberDMManyRouteInfo,
  ServerMembersCreateManyRouteInfo,
  ServerMemberUnbanOneRouteInfo,
  ServerMemberUnlinkDiscordAccountRouteInfo,
  ServerMemberUpdateLinkedGuildMemberRouteInfo,
  ServerMemberUpdateManyChangeRolesRouteInfo,
  ServerMemberUpdateOneAndLinkedGuildMemberRouteInfo,
  ServerMemberUpdateOneRouteInfo,
} from '@some-tools/shared/api/types';
import { axiosErrorResBodyToCodedFault } from '@some-tools/shared/utils/common';
import { isFail, type Result } from '@some-tools/shared/utils/try-fail';
import { tryFailAsync } from '@some-tools/shared/utils/try-fail';

import { API_BASE_REQUEST_URL, API_KEY } from '../environments';

// const unknownGuildId = '-1';

const http = axios.create({
  headers: {
    authorization: `Bearer ${API_KEY}`,
  },
  baseURL: `${API_BASE_REQUEST_URL}/discord/guilds`,
});

export const serverMemberBanOne = async (
  params: ServerMemberBanOneRouteInfo['req']['params']
): Promise<Result<ServerMemberBanOneRouteInfo['api']['ok'], ServerMemberBanOneRouteInfo['api']['error']>> =>
  tryFailAsync(async () => {
    const response = await http.put<ServerMemberBanOneRouteInfo['api']['ok']>(
      `/${params.guildId}/servermembers/${params.emailOrDiscordId}/ban`
    );
    return response.data;
  }, axiosErrorResBodyToCodedFault<ServerMemberBanOneRouteInfo['api']['error']>);

export const serverMemberFindOneByEmailOrDiscordId = async (
  params: ServerMemberFindOneByEmailOrDiscordIdRouteInfo['req']['params']
) => {
  const serverMemberResult = await tryFailAsync(async () => {
    const response = await http.get<ServerMemberFindOneByEmailOrDiscordIdRouteInfo['api']['ok']>(
      `/${params.guildId}/servermembers/${params.emailOrDiscordId}`
    );

    return response.data;
  }, axiosErrorResBodyToCodedFault<ServerMemberFindOneByEmailOrDiscordIdRouteInfo['api']['error']>);

  return serverMemberResult;
};

export const serverMemberDeleteOneByEmail = async (params: ServerMemberDeleteOneByEmailRouteInfo['req']['params']) => {
  const serverMemberResult = await tryFailAsync(async () => {
    const response = await http.delete<ServerMemberDeleteOneByEmailRouteInfo['api']['ok']>(
      `/${params.guildId}/servermembers/${params.email}`
    );

    return response.data;
  }, axiosErrorResBodyToCodedFault<ServerMemberDeleteOneByEmailRouteInfo['api']['error']>);

  return serverMemberResult;
};

/**
 * Intended for use only from the front-end join page or to be used from a back-up slash DM slash command if the join
 * page is down.
 */
export const serverMemberJoinGuildFromJoinPage = async (
  params: ServerMemberJoinGuildRouteInfo['req']['params'],
  payload: ServerMemberJoinGuildRouteInfo['req']['body']
): Promise<Result<ServerMemberJoinGuildRouteInfo['api']['ok'], ServerMemberJoinGuildRouteInfo['api']['error']>> =>
  tryFailAsync(async () => {
    const response = await http.put<ServerMemberJoinGuildRouteInfo['api']['ok']>(
      `/${params.guildId}/servermembers/join`,
      payload
    );
    return response.data;
  }, axiosErrorResBodyToCodedFault<ServerMemberJoinGuildRouteInfo['api']['error']>);

export const serverMemberKickManyLinkedDiscordAccounts = async (
  params: ServerMemberKickManyRouteInfo['req']['params'],
  payload: ServerMemberKickManyRouteInfo['req']['body']
): Promise<Result<ServerMemberKickManyRouteInfo['api']['ok'], ServerMemberKickManyRouteInfo['api']['error']>> => {
  const result = tryFailAsync(async () => {
    const response = await http.put<ServerMemberKickManyRouteInfo['api']['ok']>(
      `/${params.guildId}/servermembers/kick-many`,
      payload
    );
    return response.data;
  }, axiosErrorResBodyToCodedFault<ServerMemberKickManyRouteInfo['api']['error']>);

  return result;
};

export const serverMemberCreateOne = async (
  params: ServerMemberCreateOneRouteInfo['req']['params'],
  payload: ServerMemberCreateOneRouteInfo['req']['body']
) =>
  tryFailAsync(
    async () =>
      (await http.post<ServerMemberCreateOneRouteInfo['api']['ok']>(`/${params.guildId}/servermembers`, payload)).data,
    axiosErrorResBodyToCodedFault<ServerMemberCreateOneRouteInfo['api']['error']>
  );

export const serverMemberCreateMany = async (
  params: ServerMembersCreateManyRouteInfo['req']['params'],
  payload: ServerMembersCreateManyRouteInfo['req']['body']
) =>
  tryFailAsync(async () => {
    const response = await http.post<ServerMembersCreateManyRouteInfo['api']['ok']>(
      `/${params.guildId}/servermembers/many`,
      payload
    );
    return response.data;
  }, axiosErrorResBodyToCodedFault<ServerMembersCreateManyRouteInfo['api']['error']>);

export const serverMemberUnbanOne = async (
  params: ServerMemberBanOneRouteInfo['req']['params']
): Promise<Result<ServerMemberUnbanOneRouteInfo['api']['ok'], ServerMemberUnbanOneRouteInfo['api']['error']>> =>
  tryFailAsync(async () => {
    const response = await http.put<ServerMemberUnbanOneRouteInfo['api']['ok']>(
      `/${params.guildId}/servermembers/${params.emailOrDiscordId}/unban`
    );
    return response.data;
  }, axiosErrorResBodyToCodedFault<ServerMemberUnbanOneRouteInfo['api']['error']>);

export const serverMemberFindMany = async (
  params: ServerMemberFindManyRouteInfo['req']['params'],
  payload: ServerMemberFindManyRouteInfo['req']['body']
): Promise<Result<ServerMemberFindManyRouteInfo['api']['ok'], ServerMemberFindManyRouteInfo['api']['error']>> =>
  tryFailAsync(async () => {
    const response = await http.post<ServerMemberFindManyRouteInfo['api']['ok']>(
      `/${params.guildId}/servermembers/find-many`,
      payload
    );
    return response.data;
  }, axiosErrorResBodyToCodedFault<ServerMemberFindManyRouteInfo['api']['error']>);

/**
 * @param requestEmails If these results were from an array of emails requested, these emails will be used to show
 *    which emails were not found.
 */
export const manyServerMemberResultsToCsvRows = (
  results: Result<DiscordServerMember, { message: string }>[],
  requestEmails?: string[]
) =>
  results.map((result, i) => {
    const defaults = {
      email: null,
      firstName: null,
      lastName: null,
      discordId: null,
      error: null,
    };

    if (isFail(result)) {
      return { ...defaults, email: requestEmails?.[i] ?? null, error: result.fault.message };
    }

    const { email, firstName, lastName, discordId } = result.value;
    return { ...defaults, email, firstName, lastName, discordId };
  });

/**
 * ! This will trigger `guild-member-update.ts`. Do not call it from `guild-member-update.ts` to avoid a loop.
 */
export const serverMemberUpdateOneAndLinkedGuildMember = async (
  params: ServerMemberUpdateOneAndLinkedGuildMemberRouteInfo['req']['params'],
  payload: ServerMemberUpdateOneAndLinkedGuildMemberRouteInfo['req']['body']
) => {
  const serverMemberResult = await tryFailAsync(async () => {
    const response = await http.put<ServerMemberUpdateOneAndLinkedGuildMemberRouteInfo['api']['ok']>(
      `/${params.guildId}/servermembers/${params.emailOrDiscordId}/and-update-linked-guild-member`,
      payload
    );

    return response.data;
  }, axiosErrorResBodyToCodedFault<ServerMemberUpdateOneAndLinkedGuildMemberRouteInfo['api']['error']>);

  return serverMemberResult;
};

export const serverMemberUpdateOne = async (
  params: ServerMemberUpdateOneRouteInfo['req']['params'],
  payload: ServerMemberUpdateOneRouteInfo['req']['body']
) => {
  const serverMemberResult = await tryFailAsync(async () => {
    const response = await http.put<ServerMemberUpdateOneRouteInfo['api']['ok']>(
      `/${params.guildId}/servermembers/${params.emailOrDiscordId}`,
      payload
    );

    return response.data;
  }, axiosErrorResBodyToCodedFault<ServerMemberUpdateOneRouteInfo['api']['error']>);

  return serverMemberResult;
};

/**
 * Syncs the linked guild member based on the linked database user.
 */
export const serverMemberUpdateLinkedGuildMember = async (
  params: ServerMemberUpdateLinkedGuildMemberRouteInfo['req']['params']
): Promise<
  Result<
    ServerMemberUpdateLinkedGuildMemberRouteInfo['api']['ok'],
    ServerMemberUpdateLinkedGuildMemberRouteInfo['api']['error']
  >
> => {
  const result = await tryFailAsync(async () => {
    const response = await http.put<ServerMemberUpdateLinkedGuildMemberRouteInfo['api']['ok']>(
      `/${params.guildId}/servermembers/${params.emailOrDiscordId}/sync-linked-discord-account`
    );

    return response.data;
  }, axiosErrorResBodyToCodedFault<ServerMemberUpdateLinkedGuildMemberRouteInfo['api']['error']>);
  return result;
};

export const serverMemberUpdateManyChangeRoles = async (
  params: ServerMemberUpdateManyChangeRolesRouteInfo['req']['params'],
  payload: ServerMemberUpdateManyChangeRolesRouteInfo['req']['body']
): Promise<
  Result<
    ServerMemberUpdateManyChangeRolesRouteInfo['api']['ok'],
    ServerMemberUpdateManyChangeRolesRouteInfo['api']['error']
  >
> => {
  const updateManyResult = await tryFailAsync(async () => {
    const response = await http.put<ServerMemberUpdateManyChangeRolesRouteInfo['api']['ok']>(
      `/${params.guildId}/servermembers/roles/${params.roleUpdateMethod}`,
      payload
    );
    return response.data;
  }, axiosErrorResBodyToCodedFault<ServerMemberUpdateManyChangeRolesRouteInfo['api']['error']>);

  return updateManyResult;
};

export const serverMemberLinkDiscordAccount = async (
  params: ServerMemberLinkDiscordAccountRouteInfo['req']['params']
): Promise<
  Result<ServerMemberLinkDiscordAccountRouteInfo['api']['ok'], ServerMemberLinkDiscordAccountRouteInfo['api']['error']>
> => {
  const serverMemberResult = await tryFailAsync(async () => {
    const response = await http.put<ServerMemberLinkDiscordAccountRouteInfo['api']['ok']>(
      `/${params.guildId}/servermembers/${params.email}/link-discord-account/${params.discordId}`
    );

    return response.data;
  }, axiosErrorResBodyToCodedFault<ServerMemberLinkDiscordAccountRouteInfo['api']['error']>);

  return serverMemberResult;
};

export const serverMemberLinkedGuildMemberDMMany = async (
  params: ServerMemberLinkedGuildMemberDMManyRouteInfo['req']['params'],
  payload: ServerMemberLinkedGuildMemberDMManyRouteInfo['req']['body']
): Promise<
  Result<
    ServerMemberLinkedGuildMemberDMManyRouteInfo['api']['ok'],
    ServerMemberLinkedGuildMemberDMManyRouteInfo['api']['error']
  >
> => {
  const result = await tryFailAsync(async () => {
    const response = await http.post<ServerMemberLinkedGuildMemberDMManyRouteInfo['api']['ok']>(
      `/${params.guildId}/servermembers/direct-message-many`,
      payload
    );

    return response.data;
  }, axiosErrorResBodyToCodedFault<ServerMemberLinkedGuildMemberDMManyRouteInfo['api']['error']>);

  return result;
};

export const serverMemberUnlinkDiscordAccount = async (
  params: ServerMemberUnlinkDiscordAccountRouteInfo['req']['params'],
  payload: ServerMemberUnlinkDiscordAccountRouteInfo['req']['body']
): Promise<
  Result<
    ServerMemberUnlinkDiscordAccountRouteInfo['api']['ok'],
    ServerMemberUnlinkDiscordAccountRouteInfo['api']['error']
  >
> => {
  const serverMemberResult = await tryFailAsync(async () => {
    const response = await http.put<ServerMemberUnlinkDiscordAccountRouteInfo['api']['ok']>(
      `/${params.guildId}/servermembers/${params.email}/unlink-discord-account`,
      payload
    );

    return response.data;
  }, axiosErrorResBodyToCodedFault<ServerMemberUnlinkDiscordAccountRouteInfo['api']['error']>);

  return serverMemberResult;
};
