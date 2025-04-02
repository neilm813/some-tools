import type { HydratedDocument, Types } from 'mongoose'; // ! Node-only pkg: only use types, no runtime code or web apps that import this lib will crash.

import type {
  DiscordBulkRequestLimitFault,
  DiscordGuildMemberData,
  DiscordGuildNotCachedFault,
  DiscordInvalidRoleSelectionFault,
  DiscordInvalidRoleUpdateMethodFault,
  DiscordMemberAlreadyLinkedFault,
  DiscordMemberBanLinkedFault,
  DiscordMemberJoinFault,
  DiscordMemberLinkedFetchUtilFault,
  DiscordMemberLinkedKickUtilLenientFault,
  DiscordMemberLinkedSendDMUtilFault,
  DiscordMemberLinkedStillFault,
  DiscordMemberLinkedUpdateOneFault,
  DiscordMemberLinkedUpdateOneLenientFault,
  DiscordMemberUnbanUtilFault,
  DiscordUserData,
} from '@some-tools/shared/discord/some-bot/types';
import { Flavor } from '@some-tools/shared/types';
import type {
  DbCreateOneFault,
  DbDeleteOneFault,
  DbFindManyFault,
  DbFindOneFault,
  DbUpdateOneFault,
  RecordNotFoundFault,
} from '@some-tools/shared/utils/backend/types';
import { type RouteInfo, type RouteInfoToLibRequest } from '@some-tools/shared/utils/common';
import type { Result, ResultsWithStats } from '@some-tools/shared/utils/try-fail';

export const API_TYPE_NAMES = {
  SERVER_MEMBER: 'SERVER_MEMBER',
} as const;

export type ApiTypeNames = typeof API_TYPE_NAMES;

// Do not extend mongoose document type: https://mongoosejs.com/docs/typescript.html
/**
 * A database model of info to relate to a discord account. Their discord id is
 * saved when they use the join page to complete verification.
 */
export interface DiscordServerMember {
  /** MongoDB id. */
  _id: Types.ObjectId;
  discordId: string | null;

  /**
   * Their enrollment email may or may not match their discord account email.
   */
  email: string;
  firstName: string;
  lastName: string;

  /**
   * Discord role id's matching what roles they have in the server or should be automatically given upon joining.
   */
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The {@link DiscordServerMember} type with added mongoose properties and methods.
 */
export type MongooseServerMember = HydratedDocument<DiscordServerMember>;

export type BaseDiscordRequestParams<MoreParams = unknown> = {
  guildId: string;
} & MoreParams;

export type ServerMemberFindOneFault = RecordNotFoundFault | DbFindOneFault;
export type ServerMemberFindOneResult = Result<DiscordServerMember, ServerMemberFindOneFault>;
export type MongooseServerMemberFindOneResult = Result<MongooseServerMember, ServerMemberFindOneFault>;
export type ServerMemberFindOneByEmailOrDiscordIdRouteInfo = RouteInfo<
  BaseDiscordRequestParams<{ emailOrDiscordId: string }>,
  never,
  DiscordServerMember,
  ServerMemberFindOneFault
>;
export type ServerMemberFindOneByEmailOrDiscordIdLibRequest =
  RouteInfoToLibRequest<ServerMemberFindOneByEmailOrDiscordIdRouteInfo>;

export type ServerMemberDeleteOneFault = DiscordMemberLinkedStillFault | RecordNotFoundFault | DbDeleteOneFault;
export type ServerMemberDeleteOneByEmailRouteInfo = RouteInfo<
  BaseDiscordRequestParams<{ email: string }>,
  never,
  DiscordServerMember,
  ServerMemberDeleteOneFault
>;
export type ServerMemberDeleteOneByEmailLibRequest = RouteInfoToLibRequest<ServerMemberDeleteOneByEmailRouteInfo>;

export type ServerMemberCreateData = Pick<DiscordServerMember, 'firstName' | 'lastName' | 'email' | 'roles'>;
export type ServerMemberCreateOneRouteInfo = RouteInfo<
  BaseDiscordRequestParams,
  ServerMemberCreateData,
  DiscordServerMember,
  DbCreateOneFault<DiscordServerMember>
>;
export type ServerMemberCreateOneLibRequest = RouteInfoToLibRequest<ServerMemberCreateOneRouteInfo>;

export type ServerMembersCreateManyRouteInfo = RouteInfo<
  BaseDiscordRequestParams,
  ServerMemberCreateData[],
  ResultsWithStats<Result<DiscordServerMember, DbCreateOneFault<DiscordServerMember>>>,
  never
>;
export type ServerMembersCreateManyLibRequest = RouteInfoToLibRequest<ServerMembersCreateManyRouteInfo>;

export type ServerMemberUpdateOneData = Partial<
  Pick<DiscordServerMember, 'firstName' | 'lastName' | 'email' | 'roles'>
>;
export type ServerMemberUpdateOneFault =
  | ServerMemberFindOneFault
  | DbUpdateOneFault<DiscordServerMember>
  | DiscordGuildNotCachedFault;
export type ServerMemberUpdateOneRouteInfo = RouteInfo<
  BaseDiscordRequestParams<{ emailOrDiscordId: string }>,
  ServerMemberUpdateOneData,
  DiscordServerMember,
  ServerMemberUpdateOneFault
>;
export type ServerMemberUpdateOneLibRequest = RouteInfoToLibRequest<ServerMemberUpdateOneRouteInfo>;

export type ServerMemberUpdateOneAndLinkedGuildMemberFault =
  | ServerMemberUpdateOneFault
  | DiscordMemberLinkedUpdateOneLenientFault;
export type ServerMemberUpdateOneAndLinkedGuildMemberRouteInfo = RouteInfo<
  BaseDiscordRequestParams<{ emailOrDiscordId: string }>,
  ServerMemberUpdateOneData,
  DiscordServerMember,
  ServerMemberUpdateOneAndLinkedGuildMemberFault
>;
export type ServerMemberUpdateOneAndLinkedGuildMemberLibRequest =
  RouteInfoToLibRequest<ServerMemberUpdateOneAndLinkedGuildMemberRouteInfo>;

export type ServerMemberLinkDiscordAccountFault =
  | ServerMemberUpdateOneAndLinkedGuildMemberFault
  | DiscordMemberAlreadyLinkedFault;
export type ServerMemberLinkDiscordAccountRouteInfo = RouteInfo<
  BaseDiscordRequestParams<{ email: string; discordId: string }>,
  never,
  DiscordServerMember,
  ServerMemberLinkDiscordAccountFault
>;
export type ServerMemberLinkDiscordAccountLibRequest = RouteInfoToLibRequest<ServerMemberLinkDiscordAccountRouteInfo>;

export type ServerMemberUnlinkDiscordAccountFault =
  | ServerMemberUpdateOneFault
  | DiscordMemberLinkedKickUtilLenientFault;
export type ServerMemberUnlinkDiscordAccountRouteInfo = RouteInfo<
  BaseDiscordRequestParams<{ email: string }>,
  { shouldKick: boolean },
  DiscordServerMember,
  ServerMemberUnlinkDiscordAccountFault
>;
export type ServerMemberUnlinkDiscordAccountLibRequest =
  RouteInfoToLibRequest<ServerMemberUnlinkDiscordAccountRouteInfo>;

export type ServerMemberLinkedGuildMemberDMFault = ServerMemberFindOneFault | DiscordMemberLinkedSendDMUtilFault;
export type ServerMemberLinkedGuildMemberDMManyRouteInfo = RouteInfo<
  BaseDiscordRequestParams,
  { emails: string[]; authorId: string; message: string },
  ResultsWithStats<Result<string, ServerMemberLinkedGuildMemberDMFault>>,
  DiscordBulkRequestLimitFault | DiscordGuildNotCachedFault
>;
export type ServerMemberLinkedGuildMemberDMManyLibRequest =
  RouteInfoToLibRequest<ServerMemberLinkedGuildMemberDMManyRouteInfo>;

export const SERVER_MEMBER_ROLE_UPDATE_METHODS = {
  add: 'add',
  'change-cohort': 'change-cohort',
  postpone: 'postpone',
  remove: 'remove',
  'to-alumni': 'to-alumni',
} as const;
export type ServerMemberRoleUpdateMethods = typeof SERVER_MEMBER_ROLE_UPDATE_METHODS;
export type ServerMemberRoleUpdateMethod = keyof typeof SERVER_MEMBER_ROLE_UPDATE_METHODS;
export const isServerMemberRoleUpdateMethod = (str: string): str is ServerMemberRoleUpdateMethod =>
  str in SERVER_MEMBER_ROLE_UPDATE_METHODS;

export type ServerMemberUpdateManyChangeRolesData = {
  emails: string[];
  selectedRoles: string[];
};
export type ServerMemberUpdateManyChangeRolesRouteInfo = RouteInfo<
  BaseDiscordRequestParams<{ roleUpdateMethod: ServerMemberRoleUpdateMethod }>,
  ServerMemberUpdateManyChangeRolesData,
  ResultsWithStats<Result<DiscordServerMember, ServerMemberUpdateOneAndLinkedGuildMemberFault>>,
  | DiscordInvalidRoleSelectionFault
  | DiscordGuildNotCachedFault
  | DiscordInvalidRoleUpdateMethodFault
  | DiscordBulkRequestLimitFault
>;
export type ServerMemberUpdateManyChangeRolesLibRequest =
  RouteInfoToLibRequest<ServerMemberUpdateManyChangeRolesRouteInfo>;

export type ServerMemberUpdateLinkedGuildMemberFault = ServerMemberFindOneFault | DiscordMemberLinkedUpdateOneFault;
export type ServerMemberUpdateLinkedGuildMemberRouteInfo = RouteInfo<
  BaseDiscordRequestParams<{ emailOrDiscordId: string }>,
  never,
  DiscordServerMember,
  ServerMemberUpdateLinkedGuildMemberFault
>;
export type ServerMemberUpdateLinkedGuildMemberLibRequest =
  RouteInfoToLibRequest<ServerMemberUpdateLinkedGuildMemberRouteInfo>;

export type ServerMemberFindManyPayload = { roles: string[] } | { emails: string[] };
export type ServerMemberAndGuildMemberMergedResult = Result<
  {
    serverMember: DiscordServerMember;
    guildMemberResult: Result<DiscordGuildMemberData, DiscordMemberLinkedFetchUtilFault>;
  },
  ServerMemberFindOneFault
>;
export type ServerMemberFindManyRouteInfo = RouteInfo<
  BaseDiscordRequestParams,
  ServerMemberFindManyPayload,
  Result<DiscordServerMember, ServerMemberFindOneFault>[],
  DbFindManyFault
>;
export type ServerMemberFindManyLibRequest = RouteInfoToLibRequest<ServerMemberFindManyRouteInfo>;

export type ServerMemberKickOneFault = ServerMemberFindOneFault | DiscordMemberLinkedKickUtilLenientFault;
export type ServerMemberKickManyRouteInfo = RouteInfo<
  BaseDiscordRequestParams,
  { emails: string[] },
  ResultsWithStats<Result<DiscordServerMember, ServerMemberKickOneFault | ServerMemberUpdateOneFault>>,
  DiscordBulkRequestLimitFault | DiscordGuildNotCachedFault
>;
export type ServerMemberKickManyLibRequest = RouteInfoToLibRequest<ServerMemberKickManyRouteInfo>;

export type ServerMemberBanOneFault =
  | ServerMemberFindOneFault
  | DiscordMemberBanLinkedFault
  | DiscordGuildNotCachedFault;
export type ServerMemberBanOneRouteInfo = RouteInfo<
  BaseDiscordRequestParams<{ emailOrDiscordId: string }>,
  never,
  DiscordGuildMemberData,
  ServerMemberBanOneFault
>;
export type ServerMemberBanOneLibRequest = RouteInfoToLibRequest<ServerMemberBanOneRouteInfo>;

export type ServerMemberUnbanOneFault = ServerMemberFindOneFault | DiscordMemberUnbanUtilFault;
export type ServerMemberUnbanOneRouteInfo = RouteInfo<
  BaseDiscordRequestParams<{ emailOrDiscordId: string }>,
  never,
  DiscordUserData,
  ServerMemberUnbanOneFault
>;
export type ServerMemberUnbanOneLibRequest = RouteInfoToLibRequest<ServerMemberUnbanOneRouteInfo>;

export type ServerMemberJoinData = {
  discordAccessToken: string;
  discordTokenType: string;
  /**
   * This email is used to find the db record, else the email from their discord account is used.
   */
  enrollmentEmail?: string;
};

export type RedirectIntoJoinedGuildUrl = Flavor<string, 'RedirectIntoJoinedGuildUrl'>;
export type ServerMemberJoinGuildFault = ServerMemberUpdateOneFault | DiscordMemberJoinFault;
export type ServerMemberJoinGuildRouteInfo = RouteInfo<
  BaseDiscordRequestParams,
  ServerMemberJoinData,
  RedirectIntoJoinedGuildUrl,
  ServerMemberJoinGuildFault
>;
export type ServerMemberJoinGuildLibRequest = RouteInfoToLibRequest<ServerMemberJoinGuildRouteInfo>;
