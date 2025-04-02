import { type ServerMemberFindManyLibRequest as Req } from '@some-tools/shared/api/types';
import { mapDbFindManyFaults } from '@some-tools/shared/utils/backend/common';
import { type ExpressRequestHandler } from '@some-tools/shared/utils/backend/common';
import { isFail, ok, tryFailAsync, unwrapMapResult } from '@some-tools/shared/utils/try-fail';

import { ServerMember, serverMemberFindManyByEmails } from '../shared';

const findManyByRoles = async (roles: string[]) => {
  const result = await tryFailAsync(
    async () =>
      ServerMember.find({
        roles: {
          $all: roles,
        },
      }),
    mapDbFindManyFaults
  );

  if (isFail(result)) {
    return result;
  }

  const serverMembers = result.value;
  return ok(serverMembers.map((serverMember) => ok(serverMember)));
};

export const findManyServerMembersHandler: ExpressRequestHandler<Req> = async (req: Req, res, next) => {
  try {
    const payload = req.body;

    if ('emails' in payload) {
      const results = await serverMemberFindManyByEmails(payload.emails);
      return res.json(results);
    }

    if ('roles' in payload) {
      const result = await findManyByRoles(payload.roles);
      return unwrapMapResult(result, {
        ifOk: (results) => res.json(results),
        ifFail: (fault) => res.status(fault.httpStatus).json(fault),
      });
    }
  } catch (error) {
    return next(error);
  }
};
