/**
 * Used to prevent requests to our api taking too long due to the discord api rate limits which seems to be
 * 5 per 5 seconds. Discord.js queues requests to avoid hitting the rate limit.
 */
export const DISCORD_BULK_REQUEST_LIMIT = 40;
