// Not sure what else the learn team uses stitch data for.

import axios from 'axios';

import { DiscordTransferredEventData } from '@some-tools/shared/discord/types';
import { makeUnidentifiedFault, UnidentifiedFault } from '@some-tools/shared/utils/common';
import { ok, Result, tryFailAsync } from '@some-tools/shared/utils/try-fail';

import { PRODUCTION, STITCH_DATA_TOKEN } from '../environments';

type DiscordTransferredEventDataWithPartialServerMember = DiscordTransferredEventData & {
  serverMember: null | { email: string; roles: { id: string; name: string | null }[] };
};

const http = axios.create({
  baseURL: `https://hooks.stitchdata.com/v1/clients/179424/token/${STITCH_DATA_TOKEN}`,
});

// The response data or errors are not used.
export const forwardDiscordEventDataTransferObjectsToLearn = async (
  payload: DiscordTransferredEventDataWithPartialServerMember
): Promise<Result<unknown, UnidentifiedFault>> => {
  // Don't forward dev events.
  if (!PRODUCTION) {
    return ok(null);
  }

  return tryFailAsync(() => http.post('', payload), makeUnidentifiedFault);
};
