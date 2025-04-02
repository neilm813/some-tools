/*
The purpose of this abstraction is to enable modularizing slash commands and subcommands into separate files which
poses the following problems:

1. The subcommands need to be related to the slash command they belong to.
2. The subcommand group names and subcommand names should follow a consistent
    convention but setting them via the builder.setName method doesn't give the
    dev info on our naming convention.
3. The dev creating the slash command or subcommand doesn't easily know what
    the modular files should export.

Solutions:
  To address the above issues, creation of a slash or subcommand in their own   file will is done by importing a
  corresponding create (make) function which comes with comment documentation about the naming convention and its
  return value is what will be exported by that file.

  Through the calling of these functions, the subcommands will also be grouped and related to their parent so the
  corresponding subcommand's run method can be easily looked up to execute during the `interactionCreate` event.
*/

import { CacheType, Collection } from 'discord.js';
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type BaseInteraction,
  type ChatInputCommandInteraction,
  type Client,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
} from 'discord.js';

type ValidationTarget =
  | 'slash command name'
  | 'slash command description'
  | 'slash subcommand name'
  | 'slash subcommand description'
  | 'slash command group name'
  | 'slash command group description'
  | 'option name'
  | 'option description';

/**
 * @throws If the name or description is `undefined` or formatted incorrectly which needs to be fixed instead of caught
 *    so there are no errors when deploying commands.
 * @param nameOrDescription A name or description from a slash command, command group, or subcommand.
 * @param validationTarget What is being validated.
 * @param commandName The name of the top-level command being validated to display in the error message.
 * @param groupName The name of the command group being validated to display in the error message.
 * @param subcommandName The name of the subcommand being validated to display in the error message.
 */
const validateNameOrDescription = (
  nameOrDescription: string | undefined,
  validationTarget: ValidationTarget,
  commandName: string | undefined,
  groupName?: string,
  subcommandName?: string
) => {
  const isName = validationTarget.includes('name');
  const exampleMethod = isName ? 'setName()' : 'setDescription()';
  const formattedName = [
    ['command', commandName],
    ['group', groupName],
    ['subcommand', subcommandName],
  ]
    .filter(([, name]) => Boolean(name))
    .map(([label, name]) => `${label}: "${name}"`)
    .join(', ');

  if (nameOrDescription === undefined) {
    const message = `${validationTarget} is undefined: use builder.${exampleMethod}${
      formattedName ? ` for ${formattedName}` : ''
    }`;
    throw new Error(message);
  }

  if (isName && nameOrDescription.match(/^[a-z-]+$/) === null) {
    const message = `${validationTarget} should contain only hyphens and alphabetic characters${
      formattedName ? ` - ${formattedName}` : ''
    }`;

    throw new Error(message);
  }
};

export type RunChatInputCommandAvailableMethods =
  | {
      /**
       * An async function to run the command's logic when the command is called in a cached guild (not a DM).
       * @see [Command parsing options docs](https://discordjs.guide/slash-commands/parsing-options.html#command-options)
       * @see [Command handling docs](https://discordjs.guide/creating-your-bot/command-handling.html#individual-command-files)
       */
      runChatInputCommandInCachedGuild: (interaction: ChatInputCommandInteraction<'cached'>) => Promise<unknown>;
      runChatInputCommand?: never;
    }
  | {
      runChatInputCommandInCachedGuild?: never;
      /**
       * An async function to run the command's logic when the command is called in either a DM or a guild. Use
       * `interaction.inGuild()` to check if the interaction is from a DM. {@link ChatInputCommandInteraction.inGuild}
       * is `false` and `interaction.guild` is `null`. See {@link BaseInteraction}.
       */
      runChatInputCommand: (interaction: ChatInputCommandInteraction<CacheType>) => Promise<unknown>;
    };

/**
 * Enables separating subcommands into their own files with their own run methods that can be looked up and executed.
 */
export type ModularSlashSubcommand = {
  builder: SlashCommandSubcommandBuilder;
} & RunChatInputCommandAvailableMethods;

export type CreateModularSlashSubcommandOptions = {
  /**
   * @see [Subcommands docs](https://discordjs.guide/slash-commands/advanced-creation.html#subcommands)
   * @example
   * ```ts
   * (subcommand) =>
   * subcommand
   *   .setName('by-identifier')
   *   .setDescription('Displays general information about the user.')
   *   .addStringOption((option) =>
   *     option
   *       .setName('email-or-discord-id')
   *       .setDescription("The target user's enrollment email or discordId (right click to copy id).")
   *       .setRequired(true)
   *   ),
   * ```
   */
  builderCallback: (subcommand: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder;
} & RunChatInputCommandAvailableMethods;

/**
 * Create's an exportable subcommand and it's associated run callback
 * @throws If there's an error with how it was built that needs to be fixed instead of caught.
 */
export const makeModularSlashSubcommand = ({
  builderCallback,
  ...props
}: CreateModularSlashSubcommandOptions): ModularSlashSubcommand => ({
  builder: builderCallback(new SlashCommandSubcommandBuilder()),
  ...props,
});
/**
 * Options to create a subcommand group that will be passed to `.addSubcommandGroup` for you.
 */
interface CreateSlashSubcommandGroupOptions {
  /**
   * **Don't forget to `setDescription` otherwise you'll get an undefined error.**
   * The name will be set based on the given name option instead of from the builder.
   * @example
   * ```ts
   * (group) => group.setName('find').setDescription('Finds user information.'),
   * ```
   */
  builderCallback: (group: SlashCommandSubcommandGroupBuilder) => SlashCommandSubcommandGroupBuilder;
  subcommands: ModularSlashSubcommand[];
}

/**
 * Used to find the subcommand being executed by the subcommand group name.
 */
interface ModularSlashSubcommandGroup {
  builder: SlashCommandSubcommandGroupBuilder;
  subcommands: { [/** Subcommand name */ key: string]: ModularSlashSubcommand };
}

/**
 * Creates a single subcommand group that will later be merged when with each other individual group that belongs to
 * a SlashCommand.
 * @throws If there's an error with how it was built that needs to be fixed instead of caught.
 */
export const makeSlashSubcommandGroup = ({ subcommands, builderCallback }: CreateSlashSubcommandGroupOptions) => {
  const groupBuilder = builderCallback(new SlashCommandSubcommandGroupBuilder());

  const modularGroup: ModularSlashSubcommandGroup = {
    builder: groupBuilder,
    subcommands: {},
  };

  for (const modularSubcommand of subcommands) {
    if (modularSubcommand.builder.name in modularGroup.subcommands) {
      const message = `Subcommand "${modularSubcommand.builder.name}" has already been used in the "${groupBuilder.name}" command group.`;
      throw new Error(message);
    }

    groupBuilder.addSubcommand(modularSubcommand.builder);
    modularGroup.subcommands[modularSubcommand.builder.name] = modularSubcommand;
  }

  return modularGroup;
};

interface CreateModularSlashCommandOptions {
  /**
   * @example
   * ```ts
   * builderCallback: (command) =>
   *  command
   *    .setName('user')
   *    .setDescription('User management commands.')
   *    .setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog)
   *    .setDMPermission(false),
   * ```
   */
  builderCallback: (command: SlashCommandBuilder) => SlashCommandBuilder;
  subcommandGroups: ModularSlashSubcommandGroup[];
}

export interface ModularSlashCommand {
  builder: SlashCommandBuilder;
  groupedSubcommands: {
    [/** Group name */ key: string]: ModularSlashSubcommandGroup;
  };
}

/**
 * @throws If the command, group, subcommand, or options have a mistake that needs to be fixed by the dev instead of
 * caught and handled.
 */
const validateCreateSlashCommandNamesAndDescriptions = (createOptions: CreateModularSlashCommandOptions) => {
  const slashCommandBuilder = createOptions.builderCallback(new SlashCommandBuilder());

  // Validate top-level command.
  validateNameOrDescription(slashCommandBuilder.name, 'slash command name', slashCommandBuilder.name);
  validateNameOrDescription(slashCommandBuilder.description, 'slash command description', slashCommandBuilder.name);

  // Validate group-level name and description
  for (const modularGroup of createOptions.subcommandGroups) {
    validateNameOrDescription(
      modularGroup.builder.name,
      'slash command group name',
      slashCommandBuilder.name,
      modularGroup.builder.name
    );

    validateNameOrDescription(
      modularGroup.builder.description,
      'slash command group description',
      slashCommandBuilder.name,
      modularGroup.builder.name
    );

    Object.values(modularGroup.subcommands).forEach((modularSubcommand) => {
      // Validate subcommands

      if (slashCommandBuilder.dm_permission && !modularSubcommand.runChatInputCommand) {
        const runMethodError = `${slashCommandBuilder.name} is configured to accept DMs and therefore all it's subcommands must be created with the runChatInputCommand method instead of the runChatInputCommandInCachedGuild method sine a DM interaction contains no guild.`;
        throw new Error(runMethodError);
      }

      validateNameOrDescription(
        modularSubcommand.builder.name,
        'slash subcommand name',
        slashCommandBuilder.name,
        modularGroup.builder.name,
        modularSubcommand.builder.name
      );

      validateNameOrDescription(
        modularSubcommand.builder.description,
        'slash subcommand description',
        slashCommandBuilder.name,
        modularGroup.builder.name,
        modularSubcommand.builder.name
      );

      modularSubcommand.builder.options.forEach((option) => {
        validateNameOrDescription(
          option.name,
          'option name',
          slashCommandBuilder.name,
          modularGroup.builder.name,
          modularSubcommand.builder.name
        );

        validateNameOrDescription(
          option.description,
          'option description',
          slashCommandBuilder.name,
          modularGroup.builder.name,
          modularSubcommand.builder.name
        );
      });
    });
  }
};

/**
 * Makes an exportable SlashCommand with it's subcommand run methods keyed for lookup during execution.
 * @throws If there's an error with how it was built that needs to be fixed instead of caught.
 */
export const makeModularSlashCommand = (createOptions: CreateModularSlashCommandOptions): ModularSlashCommand => {
  const { builderCallback, subcommandGroups } = createOptions;
  validateCreateSlashCommandNamesAndDescriptions(createOptions);

  const slashCommandBuilder = builderCallback(new SlashCommandBuilder());

  const modularSlashCommand: ModularSlashCommand = {
    builder: slashCommandBuilder,
    groupedSubcommands: {},
  };

  for (const modularGroup of subcommandGroups) {
    // * Relate command groups to command.
    if (modularGroup.builder.name in modularSlashCommand.groupedSubcommands) {
      const message = `Command group "${modularGroup.builder.name}" has already been used in the "${modularSlashCommand.builder.name}" command.`;
      throw new Error(message);
    }
    modularSlashCommand.groupedSubcommands[modularGroup.builder.name] = modularGroup;
    slashCommandBuilder.addSubcommandGroup(modularGroup.builder);
  }

  return modularSlashCommand;
};

export type SlashCommands = Collection<string, ModularSlashCommand>;

export interface ExtendedClient extends Client {
  slashCommands: SlashCommands;
}

/**
 * This just makes it easier to not have to create this return structure without repeating key names so that option
 * names and required status can be referenced multiple times without being hard-coded multiple times.
 * @param info The option name as a camelCase key and the value as the required status of the option.
 */
export const makeOptionsInfo = <T extends { [optionName: string]: boolean }>(info: T) =>
  Object.entries(info).reduce<{ [Key in keyof T]: { name: string; required: T[Key] } }>(
    (accumulator, [name, required]) => ({
      ...accumulator,
      [name]: {
        name: name
          // split expected camelCase key on uppercase, and other delimiters in case they exist
          .split(/(?=[A-Z-_\s])/)
          // lower case and replace delimiters with empty string
          .map((s) => s.replace(/[-_\s]/g, '').toLowerCase())
          // remove empty strings
          .filter(Boolean)
          // the final name is lower case and hyphenated
          .join('-'),
        required,
      },
    }),
    {} as { [Key in keyof T]: { name: string; required: T[Key] } }
  );

/**
 * Extends the discord client with commands added as a prop for keyed
 * retrieval of the corresponding run method during command execution.
 * @throws If a duplicate command name is used which needs to be fixed instead of catching the error.
 */
export const addSlashCommandsToClient = (
  exportedSlashCommands: { [key: string]: ModularSlashCommand },
  client: Client
) => {
  const extendedClient = client as ExtendedClient;
  extendedClient.slashCommands = Object.values(exportedSlashCommands).reduce((collection, modularSlashCommand) => {
    if (collection.has(modularSlashCommand.builder.name)) {
      throw new Error(`Duplicate slash command name: "${modularSlashCommand.builder.name}".`);
    }

    collection.set(modularSlashCommand.builder.name, modularSlashCommand);
    return collection;
  }, new Collection<string, ModularSlashCommand>());
  return extendedClient;
};
