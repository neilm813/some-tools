import { Guild } from 'discord.js';

import {
  type DiscordServerMember,
  isServerMemberRoleUpdateMethod,
  type MongooseServerMember,
  type ServerMemberUpdateManyChangeRolesLibRequest as Req,
  type ServerMemberUpdateManyChangeRolesRouteInfo as RouteInfo,
  type ServerMemberFindOneFault,
  type ServerMemberRoleUpdateMethod,
  type ServerMemberUpdateManyChangeRolesData,
  type ServerMemberUpdateOneAndLinkedGuildMemberFault,
} from '@some-tools/shared/api/types';
import {
  DISCORD_BULK_REQUEST_LIMIT,
  getCachedGuildResult,
  getKeyRolesInfo,
  guildMemberLinkedSync,
  type KeyRolesInfo,
  makeDiscordBulkRequestLimitFault,
  makeDiscordInvalidRoleSelectionFault,
  makeDiscordInvalidRoleUpdateMethodFault,
} from '@some-tools/shared/discord/some-bot/data-access';
import {
  type ExpressRequestHandler,
  makeRecordNotFoundFault,
  mapDbFindOneFaults,
  mapDbUpdateOneFaults,
} from '@some-tools/shared/utils/backend/common';
import {
  createResultsWithStats,
  fail,
  isFail,
  ok,
  Result,
  tryFailAsync,
  unwrapMapResult,
} from '@some-tools/shared/utils/try-fail';

import { discordClient } from '../../bot';
import { ServerMember } from '../shared';

const validatorsByRoleUpdateMethod: {
  [key in ServerMemberRoleUpdateMethod]?: (
    payload: ServerMemberUpdateManyChangeRolesData,
    keyRolesInfo: KeyRolesInfo
  ) => Result<true, RouteInfo['api']['error']>;
} = {
  ['change-cohort']: (payload, keyRolesInfo) => {
    const hasCohortRole = payload.selectedRoles.some((roleId) => keyRolesInfo.isCohortRole(roleId));
    const hasStackRole = payload.selectedRoles.some((roleId) => keyRolesInfo.isStackRole(roleId));

    if ((hasCohortRole && hasStackRole) === false) {
      return fail(
        makeDiscordInvalidRoleSelectionFault(
          `A role that starts with ${keyRolesInfo.prefixes.cohort} and one that starts with ${keyRolesInfo.prefixes.stack} is required.`
        )
      );
    }
    return ok(true);
  },
};

const roleUpdaters: {
  [key in ServerMemberRoleUpdateMethod]: (
    serverMember: MongooseServerMember,
    selectedRoles: string[],
    keyRolesInfo: KeyRolesInfo
  ) => string[];
} = {
  ['to-alumni']: (serverMember, _roles, keyRolesInfo) =>
    serverMember.roles.concat(keyRolesInfo.alumni.id).filter((roleId) => {
      const isRoleStudentOrEmployeeRelated =
        keyRolesInfo.studentRelated.has(roleId) || keyRolesInfo.employeeRelated.has(roleId);

      return isRoleStudentOrEmployeeRelated ? false : true;
    }),

  add: (serverMember, selectedRoles) => Array.from(new Set(serverMember.roles.concat(selectedRoles))),

  postpone: (serverMember, _selectedRoles, keyRolesInfo) =>
    serverMember.roles
      // Filter out current cohort and stack roles to hide their cohort and stack channels.
      .filter((role) => !(keyRolesInfo.isCohortRole(role) || keyRolesInfo.isStackRole(role))),

  remove: (serverMember, selectedRoles) => {
    const rolesToRemove = selectedRoles.reduce((map, roleId) => map.set(roleId, roleId), new Map<string, string>());
    return serverMember.roles.filter((roleId) => (rolesToRemove.has(roleId) ? false : true));
  },

  ['change-cohort']: (serverMember, selectedRoles, keyRolesInfo) => {
    const isCohortRoleSelected = selectedRoles.some((roleId) => keyRolesInfo.isCohortRole(roleId));
    const isStackRoleSelected = selectedRoles.some((roleId) => keyRolesInfo.isStackRole(roleId));

    const updatedRoles = serverMember.roles
      // Filter out current cohort and stack roles but only if a replacement was provided (just in case).
      .filter((role) => {
        if (isCohortRoleSelected && keyRolesInfo.isCohortRole(role)) {
          return false;
        }

        if (isStackRoleSelected && keyRolesInfo.isStackRole(role)) {
          return false;
        }

        return true;
      })
      .concat(selectedRoles)
      // Add the student role in case it's missing which sometimes happens (unknown cause).
      .concat(keyRolesInfo.isEmployee(serverMember) ? [] : keyRolesInfo.student.id);

    const dedupedRoles = Array.from(new Set(updatedRoles));
    return dedupedRoles;
  },
};

const mapFoundServerMemberToUpdateBothResult = async (
  guild: Guild,
  data: ServerMemberUpdateManyChangeRolesData,
  keyRolesInfo: KeyRolesInfo,
  roleUpdateMethod: ServerMemberRoleUpdateMethod,
  foundServerMemberResult: Result<MongooseServerMember | null, ServerMemberFindOneFault>
): Promise<Result<MongooseServerMember, ServerMemberUpdateOneAndLinkedGuildMemberFault>> => {
  if (isFail(foundServerMemberResult)) {
    return foundServerMemberResult;
  }

  const serverMember = foundServerMemberResult.value;

  if (!serverMember) {
    return fail(makeRecordNotFoundFault());
  }

  const updatedServerMemberResult = await tryFailAsync(async () => {
    const updatedRoles = roleUpdaters[roleUpdateMethod](serverMember, data.selectedRoles, keyRolesInfo);

    return ServerMember.findByIdAndUpdate(
      serverMember._id,
      { roles: updatedRoles },
      { new: true, runValidators: true }
    );
  }, mapDbUpdateOneFaults<DiscordServerMember>);

  if (isFail(updatedServerMemberResult)) {
    return updatedServerMemberResult;
  }

  const updatedServerMember = updatedServerMemberResult.value;

  if (!updatedServerMember) {
    return fail(makeRecordNotFoundFault());
  }

  const updatedGuildMemberResult = await guildMemberLinkedSync(guild, updatedServerMember, false);

  return isFail(updatedGuildMemberResult) ? updatedGuildMemberResult : ok(updatedServerMember);
};

const changeManyServerMembersRoles = async (
  guild: Guild,
  data: ServerMemberUpdateManyChangeRolesData,
  keyRolesInfo: KeyRolesInfo,
  roleUpdateMethod: ServerMemberRoleUpdateMethod
): Promise<Result<RouteInfo['api']['ok'], RouteInfo['api']['error']>> => {
  const foundServerMemberPromises = data.emails.map(
    async (email): Promise<Result<MongooseServerMember, ServerMemberFindOneFault>> => {
      const findResult = await tryFailAsync(
        async () => ServerMember.findOne({ email: email.trim().toLowerCase() }),
        mapDbFindOneFaults
      );

      if (isFail(findResult)) {
        return findResult;
      }

      const serverMember = findResult.value;

      if (!serverMember) {
        return fail(makeRecordNotFoundFault());
      }

      return ok(serverMember);
    }
  );

  const foundServerMemberResults = await Promise.all(foundServerMemberPromises);
  const updateAndFindResultPromises = foundServerMemberResults.map((result) =>
    mapFoundServerMemberToUpdateBothResult(guild, data, keyRolesInfo, roleUpdateMethod, result)
  );

  const updateAndFindResults = await Promise.all(updateAndFindResultPromises);
  return ok(createResultsWithStats(updateAndFindResults));
};

export const updateManyChangeRolesServerMembersHandler: ExpressRequestHandler<Req> = async (req: Req, res, next) => {
  try {
    if (req.body.emails.length > DISCORD_BULK_REQUEST_LIMIT) {
      const fault = makeDiscordBulkRequestLimitFault();
      return res.status(fault.httpStatus).json(fault);
    }

    const roleUpdateMethod = req.params.roleUpdateMethod;

    if (!isServerMemberRoleUpdateMethod(roleUpdateMethod)) {
      const roleChangeMethodFault = makeDiscordInvalidRoleUpdateMethodFault(roleUpdateMethod);
      return res.status(roleChangeMethodFault.httpStatus).json(roleChangeMethodFault);
    }

    const guildResult = getCachedGuildResult(req.params.guildId, discordClient);

    if (isFail(guildResult)) {
      return res.status(guildResult.fault.httpStatus).json(guildResult.fault);
    }

    const guild = guildResult.value;
    const keyRolesInfo: KeyRolesInfo = getKeyRolesInfo(guild);
    const additionalValidator = validatorsByRoleUpdateMethod[roleUpdateMethod];

    if (additionalValidator) {
      const validationResult = additionalValidator(req.body, keyRolesInfo);

      if (isFail(validationResult)) {
        return res.status(validationResult.fault.httpStatus).json(validationResult.fault);
      }
    }

    const updateManyResult = await changeManyServerMembersRoles(guild, req.body, keyRolesInfo, roleUpdateMethod);

    return unwrapMapResult(updateManyResult, {
      ifOk: (updateResultsStats) => res.json(updateResultsStats),
      ifFail: (fault) => res.status(fault.httpStatus).json(fault),
    });
  } catch (error) {
    return next(error);
  }
};
