import { Collection, type Guild, type Role, type RoleResolvable, type Snowflake } from 'discord.js';

export const roleIdsToRoles = (guild: Guild, roleIds: Snowflake[]): Role[] =>
  roleIds.map((id) => guild.roles.cache.get(id)).filter((role): role is Role => Boolean(role));

export const roleIdsToRoleNames = (guild: Guild, roleIds: Snowflake[]): string[] =>
  roleIdsToRoles(guild, roleIds).map((role) => role.name);

export const roleIdsToSortedRoleNames = (guild: Guild, roleIds: Snowflake[]): string[] =>
  roleIdsToRoleNames(guild, roleIds).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

export const roleIdFromResolvable = (role: RoleResolvable) => (typeof role === 'string' ? role : role.id);

export const isRoleMatch = (roleA: RoleResolvable, roleB: RoleResolvable) =>
  roleIdFromResolvable(roleA) === roleIdFromResolvable(roleB);

export const isRoleInCollection = (role: RoleResolvable, roles: Collection<Snowflake, Role>) =>
  roles.has(roleIdFromResolvable(role));
