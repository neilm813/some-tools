import { Router } from 'express';

import {
  banOneServerMemberHandler,
  createManyServerMembersHandler,
  createOneServerMemberHandler,
  findManyServerMembersHandler,
  findServerMemberByEmailOrDiscordIdHandler,
  joinGuildServerMemberHandler,
  kickManyServerMembersHandler,
  sendDMToManyLinkedGuildMembersHandler,
  serverMemberDeleteByEmailHandler,
  unbanOneServerMemberHandler,
  updateLinkedGuildMemberHandler,
  updateManyChangeRolesServerMembersHandler,
  updateOneServerMember,
  updateOneServerMemberAndLinkedGuildMemberHandler,
  updateOneServerMemberLinkDiscordAccountHandler,
  updateOneServerMemberUnlinkDiscordAccountHandler,
} from './features';

export const discordServerMemberRouter = Router();
const r = discordServerMemberRouter;

r.post('/:guildId/servermembers/many', createManyServerMembersHandler);
r.post('/:guildId/servermembers/find-many', findManyServerMembersHandler);
r.post('/:guildId/servermembers', createOneServerMemberHandler);
r.post('/:guildId/servermembers/direct-message-many', sendDMToManyLinkedGuildMembersHandler);

r.put('/:guildId/servermembers/:emailOrDiscordId/ban', banOneServerMemberHandler);
r.put('/:guildId/servermembers/:emailOrDiscordId/unban', unbanOneServerMemberHandler);
r.put('/:guildId/servermembers/kick-many', kickManyServerMembersHandler);
r.put('/:guildId/servermembers/:emailOrDiscordId/sync-linked-discord-account', updateLinkedGuildMemberHandler);
r.put('/:guildId/servermembers/roles/:roleUpdateMethod', updateManyChangeRolesServerMembersHandler);
r.put(
  '/:guildId/servermembers/:emailOrDiscordId/and-update-linked-guild-member',
  updateOneServerMemberAndLinkedGuildMemberHandler
);
r.put('/:guildId/servermembers/:email/link-discord-account/:discordId', updateOneServerMemberLinkDiscordAccountHandler);
r.put('/:guildId/servermembers/:email/unlink-discord-account', updateOneServerMemberUnlinkDiscordAccountHandler);
r.put('/:guildId/servermembers/join', joinGuildServerMemberHandler);
r.put('/:guildId/servermembers/:emailOrDiscordId', updateOneServerMember);

r.get('/:guildId/servermembers/:emailOrDiscordId', findServerMemberByEmailOrDiscordIdHandler);

r.delete('/:guildId/servermembers/:email', serverMemberDeleteByEmailHandler);
