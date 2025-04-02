import type { ServerMemberDeleteOneByEmailLibRequest as Req } from '@some-tools/shared/api/types';
import { makeDiscordMemberLinkedStillFault } from '@some-tools/shared/discord/some-bot/data-access';
import { type ExpressRequestHandler, mapDbDeleteOneFault } from '@some-tools/shared/utils/backend/common';
import { isFail, tryFailAsync } from '@some-tools/shared/utils/try-fail';

import { serverMemberFindOneByEmailOrDiscordId } from '../shared';

export const serverMemberDeleteByEmailHandler: ExpressRequestHandler<Req> = async (req: Req, res, next) => {
  try {
    const serverMemberResult = await serverMemberFindOneByEmailOrDiscordId(req.params.email);

    if (isFail(serverMemberResult)) {
      return res.status(serverMemberResult.fault.httpStatus).json(serverMemberResult.fault);
    }

    const serverMember = serverMemberResult.value;

    if (serverMember.discordId) {
      const stillLinkedFault = makeDiscordMemberLinkedStillFault(serverMember);
      return res.status(stillLinkedFault.httpStatus).json(stillLinkedFault);
    }

    const deleteResult = await tryFailAsync(() => serverMember.delete(), mapDbDeleteOneFault);

    if (isFail(deleteResult)) {
      return res.status(deleteResult.fault.httpStatus).json(deleteResult.fault);
    }

    return res.json(serverMember);
  } catch (error) {
    return next(error);
  }
};
