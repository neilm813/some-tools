import { Client, Partials } from 'discord.js';

import {
  addSlashCommandsToClient,
  deploySlashCommands,
  getCachedGuildResult,
} from '@some-tools/shared/discord/some-bot/data-access';
import {
  DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID,
  DISCORD_SHOULD_DEPLOY_COMMANDS,
  DISCORD_TOKEN,
  PRODUCTION,
} from '@some-tools/shared/discord/some-bot/environments';

import * as exportedSlashCommands from '../commands';

const client = new Client({
  intents: [
    'MessageContent',
    'Guilds',
    'GuildMembers',
    'GuildBans',
    'GuildEmojisAndStickers',
    'GuildIntegrations',
    'GuildWebhooks',
    'GuildInvites',
    'GuildVoiceStates',
    'GuildPresences',
    'GuildMessages',
    'GuildMessageReactions',
    'GuildMessageTyping',
    'DirectMessages',
    'DirectMessageReactions',
    'DirectMessageTyping',
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

client
  .login(DISCORD_TOKEN)
  .then(() => console.log(`✔ ${PRODUCTION ? 'PRODUCTION' : 'DEV'} discord bot logged in`))
  .catch((error) => console.error(`${PRODUCTION ? 'PRODUCTION' : 'DEV'} discord bot failed to login:`, error));

const extendedClient = addSlashCommandsToClient(exportedSlashCommands, client);

console.log('deploy commands:', DISCORD_SHOULD_DEPLOY_COMMANDS);

if (DISCORD_SHOULD_DEPLOY_COMMANDS) {
  deploySlashCommands({
    isProduction: PRODUCTION,
    guildId: DISCORD_GUILD_ID,
    clientId: DISCORD_CLIENT_ID,
    token: DISCORD_TOKEN,
    slashCommands: extendedClient.slashCommands,
  });
}

export const getGuildById = (guildId: string) => getCachedGuildResult(guildId, client);

/**
 * A convenience function to use for params that take either a guild or a get guild callback.
 * If you don't need the guild yourself, passing in a get guild callback outsources having to check the guild result.
 */
export const makeGetGuildCallback = (guildId: string) => () => getGuildById(guildId);

export { extendedClient as discordClient };
