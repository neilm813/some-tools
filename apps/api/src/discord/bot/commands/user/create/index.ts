import { makeSlashSubcommandGroup } from '@some-tools/shared/discord/some-bot/data-access';

import { createManyStudentsSubcommand } from './many-students';
import { createOneEmployeeSubcommand } from './one-employee';
import { createOneStudentSubcommand } from './one-student';

export const userCreateSubcommandGroup = makeSlashSubcommandGroup({
  builderCallback: (group) => group.setName('create').setDescription('User creation commands.'),
  subcommands: [createOneStudentSubcommand, createManyStudentsSubcommand, createOneEmployeeSubcommand],
});
