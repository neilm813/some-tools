import { Guild } from 'discord.js';

import type {
  DiscordServerMember,
  MongooseServerMember,
  MongooseServerMemberFindOneResult,
  ServerMemberKickManyLibRequest as Req,
  ServerMemberFindOneFault,
  ServerMemberKickOneFault,
  ServerMemberUpdateOneFault,
} from '@some-tools/shared/api/types';
import {
  DISCORD_BULK_REQUEST_LIMIT,
  getKeyRolesInfo,
  guildMemberLinkedKick,
  makeDiscordBulkRequestLimitFault,
} from '@some-tools/shared/discord/some-bot/data-access';
import {
  type ExpressRequestHandler,
  mapDbUpdateOneFaults,
  mapNullOkToNotFound,
} from '@some-tools/shared/utils/backend/common';
import { createResultsWithStats, isFail, ok, Result, tryFailAsync } from '@some-tools/shared/utils/try-fail';

import { getGuildById, makeGetGuildCallback } from '../../bot';
import { ServerMember, serverMemberFindManyByEmails } from '../shared';

const kickManyLinkedGuildMembers = async (
  guildId: string,
  serverMemberResults: Result<MongooseServerMember, ServerMemberFindOneFault | ServerMemberUpdateOneFault>[]
): Promise<Result<MongooseServerMember, ServerMemberKickOneFault | ServerMemberUpdateOneFault>[]> => {
  const mergedResults = serverMemberResults.map(async (result) => {
    if (isFail(result)) {
      return result;
    }

    const serverMember = result.value;

    const kickResult = await guildMemberLinkedKick(makeGetGuildCallback(guildId), result.value, false);

    if (isFail(kickResult)) {
      return kickResult;
    }

    return ok(serverMember);
  });

  return Promise.all(mergedResults);
};

const findManyServermembersAndUpdateRoles = async (
  guild: Guild,
  emails: string[]
): Promise<Result<MongooseServerMember, ServerMemberFindOneFault | ServerMemberUpdateOneFault>[]> => {
  const keyRolesInfo = getKeyRolesInfo(guild);
  const serverMemberResults = await serverMemberFindManyByEmails(emails);

  const updatedServerMembersPromises = serverMemberResults.map(async (result) => {
    if (isFail(result)) {
      return result;
    }

    const serverMember = result.value;

    let newRoles = serverMember.roles;

    // Reset to initial student roles in case they re-enroll and re-join discord.
    if (keyRolesInfo.isStudent(serverMember)) {
      const initialStudentRoles = [
        keyRolesInfo.student.id,
        keyRolesInfo.isFullTimeProgramStudent(serverMember)
          ? keyRolesInfo.stackPreBootcampFullTime.id
          : keyRolesInfo.stackPreBootcampPartTime.id,
      ];

      newRoles = serverMember.roles
        .filter((roleId) => !keyRolesInfo.studentRelated.has(roleId))
        .concat(initialStudentRoles);
    }

    // Remove all employee access.
    if (keyRolesInfo.isEmployee(serverMember)) {
      newRoles = serverMember.roles.filter(
        (roleId) => !(keyRolesInfo.employeeRelated.has(roleId) || keyRolesInfo.studentRelated.has(roleId))
      );
    }

    const updateResult = mapNullOkToNotFound(
      await tryFailAsync(
        async () =>
          ServerMember.findByIdAndUpdate(serverMember._id, { roles: newRoles }, { runValidators: true, new: true }),
        mapDbUpdateOneFaults<DiscordServerMember>
      )
    );

    return updateResult;
  });

  return Promise.all(updatedServerMembersPromises);
};

export const kickManyServerMembersHandler: ExpressRequestHandler<Req> = async (req: Req, res, next) => {
  try {
    if (req.body.emails.length > DISCORD_BULK_REQUEST_LIMIT) {
      const fault = makeDiscordBulkRequestLimitFault();
      return res.status(fault.httpStatus).json(fault);
    }

    const guildResult = getGuildById(req.params.guildId);

    if (isFail(guildResult)) {
      return res.status(guildResult.fault.httpStatus).json(guildResult.fault);
    }

    const updatedServerMemberResults = await findManyServermembersAndUpdateRoles(guildResult.value, req.body.emails);
    const updateAndKickResults = await kickManyLinkedGuildMembers(req.params.guildId, updatedServerMemberResults);
    const resultsStats = createResultsWithStats(updateAndKickResults);
    return res.json(resultsStats);
  } catch (error) {
    return next(error);
  }
};
