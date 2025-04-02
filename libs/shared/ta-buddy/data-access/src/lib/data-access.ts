import axios from 'axios';
import { EmbedField } from 'discord.js';

import { axiosErrorResBodyToCodedFault, UnidentifiedFault } from '@some-tools/shared/utils/common';
import { isFail, tryFailAsync } from '@some-tools/shared/utils/try-fail';

import { TA_BUDDY_API_KEY, TA_BUDDY_API_URL } from '../environments';

const http = axios.create({
  baseURL: TA_BUDDY_API_URL,
});

type TaBuddyDiscordEmbedData = {
  name: string;
  value: string;
};

export const isTaBuddyDiscordEmbedData = (data: unknown): data is TaBuddyDiscordEmbedData[] => {
  if (!Array.isArray(data)) {
    return false;
  }

  if (data.length < 1) {
    return true;
  }

  const elem = data[0];

  return (
    typeof elem === 'object' &&
    elem !== null &&
    'name' in elem &&
    typeof elem.name === 'string' &&
    'value' in elem &&
    typeof elem.value === 'string'
  );
};

export const taBuddyGetUserInfoEmbedFields = async (email: string): Promise<EmbedField[]> => {
  const taBuddyResult = await tryFailAsync(async () => {
    const res = await http.post('/discord-bot', {
      key: TA_BUDDY_API_KEY,
      email_address: email,
    });

    return res.data;
  }, axiosErrorResBodyToCodedFault<UnidentifiedFault>);

  if (isFail(taBuddyResult)) {
    return [{ name: 'TA Buddy Error', value: taBuddyResult.fault.message, inline: false }];
  }

  const taBuddyDiscordEmbedData = taBuddyResult.value;

  if (!isTaBuddyDiscordEmbedData(taBuddyDiscordEmbedData)) {
    return [{ name: 'TA Buddy Error', value: 'Unexpected data type received.', inline: false }];
  }

  if (taBuddyDiscordEmbedData.length === 0) {
    return [{ name: 'TA Buddy', value: 'No data.', inline: false }];
  }

  return taBuddyDiscordEmbedData.map(({ name, value }): EmbedField => {
    return {
      name,
      value,
      inline: false,
    };
  });
};
