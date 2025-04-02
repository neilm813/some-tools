import { type FilterQuery } from 'mongoose';

import type { DiscordServerMember, MongooseServerMemberFindOneResult } from '@some-tools/shared/api/types';
import { mapDbFindOneFaults, mapNullOkToNotFound } from '@some-tools/shared/utils/backend/common';
import { tryFailAsync } from '@some-tools/shared/utils/try-fail';

import { ServerMember } from './server-member-model';

export const emailOrDiscordIdQuery = (emailOrDiscordId: string): FilterQuery<DiscordServerMember> => {
  return {
    $or: [{ email: emailOrDiscordId }, { discordId: emailOrDiscordId }],
  };
};

export const serverMemberFindOneByEmail = async (email: string): Promise<MongooseServerMemberFindOneResult> =>
  mapNullOkToNotFound(await tryFailAsync(async () => ServerMember.findOne({ email }), mapDbFindOneFaults));

export const serverMemberFindOneEitherEmailOrDiscordId = async (
  email: string,
  discordId: string
): Promise<MongooseServerMemberFindOneResult> =>
  mapNullOkToNotFound(
    await tryFailAsync(
      async () =>
        ServerMember.findOne({
          $or: [{ email }, { discordId }],
        }),
      mapDbFindOneFaults
    )
  );

export const serverMemberFindOneByEmailOrDiscordId = async (
  emailOrDiscordId: string
): Promise<MongooseServerMemberFindOneResult> =>
  mapNullOkToNotFound(
    await tryFailAsync(async () => ServerMember.findOne(emailOrDiscordIdQuery(emailOrDiscordId)), mapDbFindOneFaults)
  );

export const serverMemberFindManyByEmails = async (emails: string[]): Promise<MongooseServerMemberFindOneResult[]> =>
  Promise.all(emails.map((email) => serverMemberFindOneByEmail(email)));
