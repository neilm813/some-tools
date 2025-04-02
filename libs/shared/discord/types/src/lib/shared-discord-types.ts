import { type Guild } from 'discord.js';

import { Result } from '@some-tools/shared/utils/try-fail';

import { DiscordGuildNotCachedFault } from './error-types';

type GuildResult = Result<Guild, DiscordGuildNotCachedFault>;
export type GetGuildCallback = () => GuildResult;
export type GuildOrGetGuildCallback = Guild | GetGuildCallback;
