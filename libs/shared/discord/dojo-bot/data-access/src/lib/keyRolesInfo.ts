import { Collection, Guild, GuildMember, italic, type Role, type RoleResolvable, type Snowflake } from 'discord.js';

import {
  doesMemberHaveAnyOfRoles,
  doesMemberHaveRole,
  type GuildMemberOrMemberWithRoles,
  isRoleInCollection,
  isRoleMatch,
} from '@some-tools/shared/discord/some-bot/data-access';

export const keyRolePrefixes = {
  stack: 'stack-',
  internalStack: 'internal-stack-',
  internalCohortInternational: 'internal-cohort-',
  cohort: 'cohort-',
};

export const keyRoleSuffixes = {
  partTime: '-pt',
  fullTime: '-ft',
};

export const keyRoleNames = {
  stackInternalAll: `${keyRolePrefixes.internalStack}all`,
  stackInternalAllInternational: `${keyRolePrefixes.internalStack}all-international`,
  // Same role for both FT and PT for now.
  stackPreBootcampFullTime: `${keyRolePrefixes.stack}prebootcamp`,
  stackPreBootcampPartTime: `${keyRolePrefixes.stack}prebootcamp`,
  stackProgrammingBasicsFullTime: `${keyRolePrefixes.stack}programming-basics${keyRoleSuffixes.fullTime}`,
  stackProgrammingBasicsPartTime: `${keyRolePrefixes.stack}programming-basics${keyRoleSuffixes.partTime}`,
  employee: 'employee',
  instructor: 'instructor',
  teacherAssistant: 'teacher-assistant',
  teacherAssistantFullTimeProgram: `ta-prog${keyRoleSuffixes.fullTime}`,
  teacherAssistantPartTimeProgram: `ta-prog${keyRoleSuffixes.partTime}`,
  student: 'student',
  alumni: 'alumni',
  // Hack: channels with his role in their permissions are temp channels to be deleted later. Could track this in DB.
  tempChannel: 'temp-channel',
};

type KeyNamedRoles = { [key in keyof typeof keyRoleNames]: Role };

/**
 * Groups key roles and related utils that are used by the bot for a guild.
 * @param guild The guild to find roles in. A Guild is available via `.guild` on many discord types or can be fetched
 *    by id via: `client.guilds.fetch`.
 * @throws If an expected key role was not found, intended to be caught at a higher-level than inside a command so that
 *    each command doesn't have to keep dealing with `Role | undefined`.
 * @internalRemarks
 * ! If role names are changed this code must change. Using hard-coded ids constrains the bot to one guild.
 * ! This could be made more resilient via complex bot-setup commands that are ran when the bot joins a server so it
 * ! can save these conventional roles to the database per-guild.
 */
export const getKeyRolesInfo = (guild: Guild) => {
  const notFoundRoleNames: string[] = [];

  const partialRoles = Object.entries(keyRoleNames).reduce<Partial<KeyNamedRoles>>((table, [roleKey, roleName]) => {
    const role = guild.roles.cache.find((role) => role.name.trim().toLowerCase() === roleName.toLowerCase());

    if (role === undefined) {
      notFoundRoleNames.push(roleName);
    } else {
      table[roleKey as keyof typeof keyRoleNames] = role;
    }

    return table;
  }, {});

  if (notFoundRoleNames.length) {
    const errorMessage = `Key roles not found by case-insensitive name match, make sure they haven't been renamed: ${notFoundRoleNames.join(
      ', '
    )}.`;
    throw new Error(errorMessage);
  }

  // This cast is now safe because there was no error thrown due to missing roles.
  const roles = partialRoles as KeyNamedRoles;

  const stacksAll = guild.roles.cache.filter((role) =>
    role.name.trim().toLowerCase().startsWith(keyRolePrefixes.stack)
  );
  const cohortsAll = guild.roles.cache.filter((role) =>
    role.name.trim().toLowerCase().startsWith(keyRolePrefixes.cohort)
  );
  const stacksPartTime = stacksAll.filter((role) => role.name.trim().toLowerCase().endsWith(keyRoleSuffixes.partTime));
  const stacksFullTime = stacksAll.filter(
    (role) => role.name.trim().toLowerCase().endsWith(keyRoleSuffixes.partTime) === false
  );

  const stacksInternalAll = guild.roles.cache.filter((role) =>
    role.name.trim().toLowerCase().startsWith(keyRolePrefixes.internalStack)
  );

  const cohortsInternalAllInternational = guild.roles.cache.filter((role) =>
    role.name.trim().toLowerCase().startsWith(keyRolePrefixes.internalCohortInternational)
  );

  const stacksInternalPartTime = stacksInternalAll.filter((role) =>
    role.name.trim().toLowerCase().endsWith(keyRoleSuffixes.partTime)
  );
  const stacksInternalFullTime = stacksInternalAll.filter(
    (role) =>
      role.name.trim().toLowerCase().endsWith(keyRoleSuffixes.partTime) === false &&
      role.id !== roles.stackInternalAll.id &&
      role.id !== roles.stackInternalAllInternational.id
  );

  const base = new Collection<Snowflake, Role>(
    [roles.student, roles.alumni, roles.employee].map((role) => [role.id, role])
  );

  const employeeRelated = guild.roles.cache.filter((role) => role.permissions.has('MoveMembers')).concat(cohortsAll);

  const studentRelated = new Collection<Snowflake, Role>([roles.student].map((role) => [role.id, role])).concat(
    cohortsAll,
    stacksAll
  );

  const adminRoles = guild.roles.cache.filter((role) => role.permissions.has('Administrator'));

  const isPartTimeProgramStudent = (member: GuildMemberOrMemberWithRoles) =>
    doesMemberHaveRole(member, roles.student) && doesMemberHaveAnyOfRoles(member, stacksPartTime);

  const isFullTimeProgramStudent = (member: GuildMemberOrMemberWithRoles) =>
    doesMemberHaveRole(member, roles.student) && doesMemberHaveAnyOfRoles(member, stacksFullTime);

  return {
    prefixes: keyRolePrefixes,
    suffixes: keyRoleSuffixes,
    /** Roles with admin permission. */
    admins: adminRoles,
    /** All stack roles for students (non-internal) to give access to stack-specific categories and channels. */
    stacksAll,
    /** Part-time stack roles for students (non-internal). */
    stacksPartTime,
    /** Full-time stack roles for students (non-internal). */
    stacksFullTime,
    /** Cohort roles for students and employees to give access to cohort channels. */
    cohortsAll,
    /** All internal stack roles for employees to give access to stack-specific categories and channels. */
    stacksInternalAll,
    /** All international internal stack roles for employees to give access to stack-specific categories and channels. */
    cohortsInternalAllInternational,
    /** Internal stack role to access all domestic stack categories and channels */
    stackInternalAll: roles.stackInternalAll,
    /** Internal stack role to access all international stack categories and channels */
    stackInternalAllInternational: roles.stackInternalAllInternational,
    /** Part-time internal stack roles for employees to give access to stack-specific categories and channels. */
    stacksInternalPartTime,
    /** Full-time internal stack roles for employees to give access to stack-specific categories and channels. */
    stacksInternalFullTime,
    /**
     * Use optional chaining.
     * Only `undefined` due to an unexpected discord error or if role name was changed function needs updating.
     */
    stackPreBootcampFullTime: roles.stackPreBootcampFullTime,
    /**
     * Use optional chaining.
     * Only `undefined` due to an unexpected discord error or if role name was changed function needs updating.
     */
    stackPreBootcampPartTime: roles.stackPreBootcampPartTime,
    /**
     * Use optional chaining.
     * Only `undefined` due to an unexpected discord error or if role name was changed function needs updating.
     */
    stackProgrammingBasicsFullTime: roles.stackProgrammingBasicsFullTime,
    /**
     * Use optional chaining.
     * Only `undefined` due to an unexpected discord error or if role name was changed function needs updating.
     */
    stackProgrammingBasicsPartTime: roles.stackProgrammingBasicsPartTime,
    /**
     * Use optional chaining.
     * Only `undefined` due to an unexpected discord error or if role name was changed function needs updating.
     */
    employee: roles.employee,
    /**
     * Use optional chaining.
     * Only `undefined` due to an unexpected discord error or if role name was changed function needs updating.
     */
    instructor: roles.instructor,
    /**
     * Use optional chaining.
     * Only `undefined` due to an unexpected discord error or if role name was changed function needs updating.
     */
    student: roles.student,
    /**
     * Use optional chaining.
     * Only `undefined` due to an unexpected discord error or if role name was changed function needs updating.
     */
    alumni: roles.alumni,
    /** Temporary voice channels are detected when this role is found in the voice channel's permissions. */
    tempChannel: roles.tempChannel,
    /** All employee-specific roles found based on having elevated permissions. */
    employeeRelated,
    /** All student-specific roles to be removed upon graduation (stack, cohort, student) */
    studentRelated,
    /** Base teacher assistant role. */
    teacherAssistant: roles.teacherAssistant,
    /** Full-time program specific teacher assistant. */
    teacherAssistantFullTimeProgram: roles.teacherAssistantFullTimeProgram,
    /** Part-time program specific teacher assistant. */
    teacherAssistantPartTimeProgram: roles.teacherAssistantPartTimeProgram,
    /** All members must have one of these base roles (student, employee, alumni). */
    base,

    isStudent: (member: GuildMemberOrMemberWithRoles) => doesMemberHaveRole(member, roles.student),
    isAlumni: (member: GuildMemberOrMemberWithRoles) => doesMemberHaveRole(member, roles.alumni),
    isPartTimeProgramStudent,
    isFullTimeProgramStudent,

    isEmployee: (member: GuildMemberOrMemberWithRoles) => doesMemberHaveRole(member, roles.employee),
    isAdmin: (member: GuildMemberOrMemberWithRoles) => doesMemberHaveAnyOfRoles(member, adminRoles),
    isInstructor: (member: GuildMemberOrMemberWithRoles) => doesMemberHaveRole(member, roles.instructor),
    isTeacherAssistant: (member: GuildMemberOrMemberWithRoles) => doesMemberHaveRole(member, roles.teacherAssistant),
    isPartTimeProgramTeacherAssistant: (member: GuildMemberOrMemberWithRoles) =>
      doesMemberHaveRole(member, roles.teacherAssistantPartTimeProgram),
    isFullTimeProgramTeacherAssistant: (member: GuildMemberOrMemberWithRoles) =>
      doesMemberHaveRole(member, roles.teacherAssistantFullTimeProgram),
    getGuildMembersCohortRole: (member: GuildMember) =>
      member.roles.cache.find((role) => isRoleInCollection(role, cohortsAll)),
    /**
     * Gets the TA role that is responsible for helping this student. If a more specific TA role can't be determined,
     * the main TA role is returned.
     */
    getTeacherAssistantRoleForStudent: (member: GuildMember) =>
      isPartTimeProgramStudent(member)
        ? roles.teacherAssistantPartTimeProgram
        : isFullTimeProgramStudent(member)
        ? roles.teacherAssistantFullTimeProgram
        : roles.teacherAssistant,

    isAdminRole: (role: RoleResolvable) => isRoleInCollection(role, adminRoles),
    isCohortRole: (role: RoleResolvable) => isRoleInCollection(role, cohortsAll),
    isStackRole: (role: RoleResolvable) => isRoleInCollection(role, stacksAll),
    isInternalStackRole: (role: RoleResolvable) => isRoleInCollection(role, stacksInternalAll),
    isInternalInternationalCohortRole: (role: RoleResolvable) =>
      isRoleInCollection(role, cohortsInternalAllInternational),

    isProgrammingBasicsStackRole: (role: RoleResolvable) =>
      isRoleMatch(role, roles.stackProgrammingBasicsFullTime) ||
      isRoleMatch(role, roles.stackProgrammingBasicsPartTime),
    isPreBootcampStackRole: (role: RoleResolvable) =>
      isRoleMatch(role, roles.stackPreBootcampFullTime) || isRoleMatch(role, roles.stackPreBootcampPartTime),

    errors: {
      cohortFormat: `Selected cohort roles must start with ${italic(keyRolePrefixes.cohort)}`,
      stackFormat: `Selected stack roles must start with ${italic(keyRolePrefixes.stack)}`,
      internalStackFormat: `Selected internal stack roles must start with ${italic(keyRolePrefixes.internalStack)}`,
    },
  };
};

export type KeyRolesInfo = ReturnType<typeof getKeyRolesInfo>;
