import { bold, Guild, italic, userMention } from 'discord.js';

import {
  type ServerMemberLinkedGuildMemberDMManyLibRequest as Req,
  type ServerMemberLinkedGuildMemberDMFault,
} from '@some-tools/shared/api/types';
import {
  DISCORD_BULK_REQUEST_LIMIT,
  guildMemberLinkedDM,
  makeDiscordBulkRequestLimitFault,
} from '@some-tools/shared/discord/some-bot/data-access';
import { type ExpressRequestHandler } from '@some-tools/shared/utils/backend/common';
import { EMOJIS } from '@some-tools/shared/utils/common';
import { createResultsWithStats, isFail, ok, Result } from '@some-tools/shared/utils/try-fail';

import { getGuildById } from '../../bot';
import { serverMemberFindManyByEmails, serverMemberFindOneByEmailOrDiscordId } from '../shared';

/**
 * Can be used with no args to get the length of extra characters added to the message.
 */
const messageTemplate = (message: string, authorDiscordId: string) => `${bold('Coding Some Mail')}
${italic(
  `${EMOJIS.message} from ${userMention(authorDiscordId)}`
)} ${`(${EMOJIS.backhandIndexPointingLeft} click here to reply):`}
---
${message}`;

/**
 * The ok result includes only the sent message id.
 */
const sendDMToLinkedGuildMembers = async (
  guild: Guild,
  emails: string[],
  message: string,
  authorDiscordId: string
): Promise<Result<string, ServerMemberLinkedGuildMemberDMFault>[]> => {
  const authorServerMemberResult = await serverMemberFindOneByEmailOrDiscordId(authorDiscordId);
  const serverMemberResults = await serverMemberFindManyByEmails(emails);

  // DM the author as well so they can see how the message was formatted.
  serverMemberResults.push(authorServerMemberResult);

  const findAndDMResultPromises = serverMemberResults.map(async (result) => {
    if (isFail(result)) {
      return result;
    }

    const fetchGuildMemberAndDMResult = await guildMemberLinkedDM(
      guild,
      result.value,
      messageTemplate(message, authorDiscordId)
    );

    if (isFail(fetchGuildMemberAndDMResult)) {
      return fetchGuildMemberAndDMResult;
    }

    return ok(fetchGuildMemberAndDMResult.value.id);
  });

  return Promise.all(findAndDMResultPromises);
};

export const sendDMToManyLinkedGuildMembersHandler: ExpressRequestHandler<Req> = async (req, res, next) => {
  try {
    const guildResult = getGuildById(req.params.guildId);

    if (isFail(guildResult)) {
      return res.status(guildResult.fault.httpStatus).json(guildResult.fault);
    }

    if (req.body.emails.length > DISCORD_BULK_REQUEST_LIMIT) {
      const fault = makeDiscordBulkRequestLimitFault();
      return res.status(fault.httpStatus).json(fault);
    }

    const results = await sendDMToLinkedGuildMembers(
      guildResult.value,
      req.body.emails,
      req.body.message,
      req.body.authorId
    );

    const resultsStats = createResultsWithStats(results);
    return res.json(resultsStats);
  } catch (error) {
    return next(error);
  }
};
