import {
  type DiscordServerMember,
  type ServerMembersCreateManyLibRequest as Req,
  type ServerMembersCreateManyRouteInfo as RouteInfo,
} from '@some-tools/shared/api/types';
import { type ExpressRequestHandler, mapDbCreateOneFaults } from '@some-tools/shared/utils/backend/common';
import { createResultsWithStats, tryFailAsync } from '@some-tools/shared/utils/try-fail';

import { ServerMember } from '../shared';

const createManyServerMembers = async (payload: RouteInfo['req']['body']) => {
  const promises = payload.map((createData) =>
    tryFailAsync(() => ServerMember.create(createData), mapDbCreateOneFaults<DiscordServerMember>)
  );

  return Promise.all(promises);
};

export const createManyServerMembersHandler: ExpressRequestHandler<Req> = async (req, res, next) => {
  try {
    const results = await createManyServerMembers(req.body);
    return res.json(createResultsWithStats(results));
  } catch (error) {
    return next(error);
  }
};

/*
Since this is a bulk create, the endpoint will only have an http error if something unexpected happens.

Otherwise, the response is an array in the same order as the given payloads where each index is either the successfully
created data or an error encountered so that some errors don't block the successful ones.

The consumer will need to discriminate with a type guard if it's the success data, else it's a union of possible errors and a report can be created to indicate which ones failed.
*/
